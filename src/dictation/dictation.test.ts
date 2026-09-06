import { expect, test, vi } from "vitest";
import { createDictation } from "./dictation";
import type { SessionListener, SessionStartOptions } from "./dictation";
import { createFakeSession } from "./fake-session";

function createHarness(options?: {
  onFlush?: (text: string, reason: "pause" | "stop") => void;
}) {
  let listener: SessionListener | undefined;
  const flushes: string[] = [];
  const sessionCalls = {
    start: 0,
    stop: 0,
    endOfAudio: 0,
    pcm: [] as Uint8Array[],
  };
  const dictation = createDictation({
    session: {
      start(next) {
        sessionCalls.start += 1;
        listener = next;
      },
      sendPcm(pcm) {
        sessionCalls.pcm.push(pcm);
      },
      sendEndOfAudio() {
        sessionCalls.endOfAudio += 1;
        listener?.onAudioEnded();
      },
      stop() {
        sessionCalls.stop += 1;
      },
    },
    caretInject: {
      beginDictation() {},
      inject(text) {
        flushes.push(text);
        return { kind: "pasted" as const };
      },
    },
    onFlush: options?.onFlush,
  });
  return {
    dictation,
    flushes,
    sessionCalls,
    emitDraft(text: string) {
      listener?.onDraft(text);
    },
    emitCommit(text: string) {
      listener?.onCommit(text);
    },
  };
}

test("start shows Overlay listening with no Draft", () => {
  const { dictation } = createHarness();

  dictation.start();

  expect(dictation.snapshot()).toEqual({
    status: "listening",
    draft: "",
    commits: [],
    error: null,
    meter: 0,
    overlayVisible: true,
  });
});

test("a Gemini-shaped Session event becomes a Draft or Commit on the Overlay", () => {
  const { session, emitGemini } = createFakeSession();
  const dictation = createDictation({
    session,
    caretInject: { beginDictation() {}, inject() { return { kind: "pasted" as const }; } },
  });

  dictation.start();
  emitGemini({ type: "interim", text: "hel" });

  expect(dictation.snapshot().draft).toBe("hel");

  emitGemini({ finished: true, text: "hello" });

  expect(dictation.snapshot().draft).toBe("");
  expect(dictation.snapshot().commits).toEqual(["hello"]);
});

test("a Session Draft appears on the Overlay", () => {
  const { dictation, emitDraft } = createHarness();

  dictation.start();
  emitDraft("hel");

  expect(dictation.snapshot().draft).toBe("hel");
  expect(dictation.snapshot().commits).toEqual([]);
});

test("a Session Commit replaces the Draft and accumulates", () => {
  const { dictation, emitDraft, emitCommit } = createHarness();

  dictation.start();
  emitDraft("hel");
  emitCommit("hello");

  expect(dictation.snapshot().draft).toBe("");
  expect(dictation.snapshot().commits).toEqual(["hello"]);
});

test("Pause Flushes accumulated Commits and keeps Dictation alive", async () => {
  const { dictation, emitCommit, flushes, sessionCalls } = createHarness();

  dictation.start();
  emitCommit("hello");
  emitCommit("world");
  await dictation.pause();

  expect(flushes).toEqual(["hello world"]);
  expect(dictation.snapshot()).toMatchObject({
    status: "paused",
    draft: "",
    commits: [],
    overlayVisible: true,
  });
  expect(sessionCalls.stop).toBe(0);
  expect(sessionCalls.start).toBe(1);
  expect(sessionCalls.endOfAudio).toBe(1);
});

test("a second Pause while Flush is pending does not end audio again", async () => {
  const { dictation, emitDraft, emitCommit, sessionCalls } = createHarness();

  dictation.start();
  emitCommit("hello");
  emitDraft("wor");
  const first = dictation.pause();
  const second = dictation.pause();
  emitCommit("world");
  await Promise.all([first, second]);

  expect(sessionCalls.endOfAudio).toBe(1);
});

test("Pause does not Flush while a Draft is still moving", async () => {
  const { dictation, emitDraft, emitCommit, flushes } = createHarness();

  dictation.start();
  emitCommit("hello");
  emitDraft("wor");
  const pausePromise = dictation.pause();

  expect(flushes).toEqual([]);
  expect(dictation.snapshot().overlayVisible).toBe(true);

  emitCommit("world");
  await pausePromise;

  expect(flushes).toEqual(["hello world"]);
  expect(dictation.snapshot().draft).toBe("");
  expect(dictation.snapshot().commits).toEqual([]);
  expect(dictation.snapshot().status).toBe("paused");
});

test("Resume continues the same Dictation Session", async () => {
  const { dictation, emitCommit, flushes, sessionCalls } = createHarness();

  dictation.start();
  emitCommit("hello");
  await dictation.pause();
  dictation.resume();
  emitCommit("again");
  await dictation.pause();

  expect(sessionCalls.start).toBe(1);
  expect(sessionCalls.stop).toBe(0);
  expect(dictation.snapshot().status).toBe("paused");
  expect(dictation.snapshot().overlayVisible).toBe(true);
  expect(flushes).toEqual(["hello", "again"]);
});

test("Stop Flushes then ends Dictation and hides Overlay", async () => {
  const { dictation, emitCommit, flushes, sessionCalls } = createHarness();

  dictation.start();
  emitCommit("hello");
  await dictation.stop();

  expect(flushes).toEqual(["hello"]);
  expect(dictation.snapshot()).toMatchObject({
    status: "idle",
    overlayVisible: false,
    draft: "",
    commits: [],
  });
  // No Draft left — Stop pastes without waiting on another end-of-audio cycle.
  expect(sessionCalls.endOfAudio).toBe(0);
  expect(sessionCalls.stop).toBe(1);
});

test("Stop records Flushed text for History before ending Dictation", async () => {
  const flushed: Array<{ text: string; reason: "pause" | "stop" }> = [];
  const { dictation, emitCommit } = createHarness({
    onFlush(text, reason) {
      flushed.push({ text, reason });
    },
  });

  dictation.start();
  emitCommit("hello there");
  await dictation.stop();

  expect(flushed).toEqual([{ text: "hello there", reason: "stop" }]);
});

test("Pause records Flushed text for History", async () => {
  const flushed: Array<{ text: string; reason: "pause" | "stop" }> = [];
  const { dictation, emitCommit } = createHarness({
    onFlush(text, reason) {
      flushed.push({ text, reason });
    },
  });

  dictation.start();
  emitCommit("hello");
  await dictation.pause();

  expect(flushed).toEqual([{ text: "hello", reason: "pause" }]);
});

test("a second start while Dictation is live Stops instead of opening another", async () => {
  const { dictation, emitCommit, flushes, sessionCalls } = createHarness();

  dictation.start();
  emitCommit("hello");
  await dictation.start();

  expect(flushes).toEqual(["hello"]);
  expect(dictation.snapshot().overlayVisible).toBe(false);
  expect(sessionCalls.start).toBe(1);
  expect(sessionCalls.stop).toBe(1);
});

test("Stop hides Overlay immediately when no Draft is moving", async () => {
  const { dictation, emitCommit } = createHarness();

  dictation.start();
  emitCommit("hello");
  const stopPromise = dictation.stop();

  expect(dictation.snapshot().overlayVisible).toBe(false);
  await stopPromise;
});

test("Stop hides Overlay immediately even while a Draft is still moving", async () => {
  const { dictation, emitDraft, emitCommit, flushes, sessionCalls } =
    createHarness();

  dictation.start();
  emitCommit("hello");
  emitDraft("wor");
  void dictation.stop();

  expect(flushes).toEqual([]);
  expect(dictation.snapshot().overlayVisible).toBe(false);
  expect(sessionCalls.stop).toBe(0);

  emitCommit("world");

  await dictation.stop();
  expect(sessionCalls.stop).toBe(1);
});

test("PCM is sent to the Session only while listening", async () => {
  const { dictation, sessionCalls } = createHarness();
  const live = new Uint8Array([1, 2]);
  const paused = new Uint8Array([3]);

  dictation.start();
  dictation.sendPcm(live);
  await dictation.pause();
  dictation.sendPcm(paused);

  expect(sessionCalls.pcm).toEqual([live]);
});

test("Dictation has no Cancel or discard path", () => {
  const { dictation } = createHarness();
  expect(dictation).not.toHaveProperty("cancel");
  expect(dictation).not.toHaveProperty("discard");
});

test("Stop is a no-op when Dictation is idle", async () => {
  const { dictation, flushes, sessionCalls } = createHarness();

  await dictation.stop();

  expect(flushes).toEqual([]);
  expect(sessionCalls.stop).toBe(0);
  expect(sessionCalls.endOfAudio).toBe(0);
  expect(dictation.snapshot().overlayVisible).toBe(false);
});

test("Pause includes a last Commit that arrives after end-of-audio", async () => {
  let listener: SessionListener | undefined;
  const flushes: string[] = [];
  const dictation = createDictation({
    session: {
      start(next) {
        listener = next;
      },
      sendPcm() {},
      sendEndOfAudio() {},
      stop() {},
    },
    caretInject: {
      beginDictation() {},
      inject(text) {
        flushes.push(text);
        return { kind: "pasted" as const };
      },
    },
  });

  dictation.start();
  listener?.onCommit("hello");
  dictation.pause();
  listener?.onCommit("world");
  listener?.onAudioEnded();
  await dictation.pause();

  expect(flushes).toEqual(["hello world"]);
  expect(dictation.snapshot().status).toBe("paused");
});

test("clipboard fallback sets error on snapshot after Flush", async () => {
  let listener: SessionListener | undefined;
  const dictation = createDictation({
    session: {
      start(next) {
        listener = next;
      },
      sendPcm() {},
      sendEndOfAudio() {
        listener?.onAudioEnded();
      },
      stop() {},
    },
    caretInject: {
      beginDictation() {},
      inject() {
        return {
          kind: "clipboard" as const,
          message: "Could not paste at the caret. Text is on the clipboard.",
        };
      },
    },
  });

  dictation.start();
  listener?.onCommit("hello");
  await dictation.pause();

  expect(dictation.snapshot().error).toBe(
    "Could not paste at the caret. Text is on the clipboard.",
  );
  expect(dictation.snapshot().commits).toEqual([]);
});

test("skipped Flush keeps Commits on the Overlay", async () => {
  let listener: SessionListener | undefined;
  const dictation = createDictation({
    session: {
      start(next) {
        listener = next;
      },
      sendPcm() {},
      sendEndOfAudio() {
        listener?.onAudioEnded();
      },
      stop() {},
    },
    caretInject: {
      beginDictation() {},
      inject() {
        return { kind: "skipped" as const, reason: "target-changed" };
      },
    },
  });

  dictation.start();
  listener?.onCommit("hello");
  await dictation.pause();

  expect(dictation.snapshot().error).toBe("Target window changed. Flush skipped.");
  expect(dictation.snapshot().commits).toEqual(["hello"]);
  expect(dictation.snapshot().status).toBe("paused");
});

test("invalid Key from Session is an Overlay error", () => {
  let listener: SessionListener | undefined;
  const sessionCalls = { start: 0, stop: 0 };
  const dictation = createDictation({
    session: {
      start(next) {
        sessionCalls.start += 1;
        listener = next;
      },
      sendPcm() {},
      sendEndOfAudio() {},
      stop() {
        sessionCalls.stop += 1;
      },
    },
    caretInject: {
      beginDictation() {},
      inject() {
        return { kind: "pasted" as const };
      },
    },
  });

  dictation.start();
  listener?.onError?.("Your Key is invalid. Check Studio Settings.");

  expect(dictation.snapshot()).toMatchObject({
    status: "idle",
    overlayVisible: true,
    error: "Your Key is invalid. Check Studio Settings.",
  });
  expect(sessionCalls.stop).toBe(1);
});

test("missing mic is an Overlay error", () => {
  const { dictation, sessionCalls } = createHarness();

  dictation.start();
  dictation.fail("No microphone found.");

  expect(dictation.snapshot()).toMatchObject({
    status: "idle",
    overlayVisible: true,
    error: "No microphone found.",
  });
  expect(sessionCalls.stop).toBe(1);
});

test("Session reconnect shows a short Overlay note", () => {
  let listener: SessionListener | undefined;
  const dictation = createDictation({
    session: {
      start(next) {
        listener = next;
      },
      sendPcm() {},
      sendEndOfAudio() {},
      stop() {},
    },
    caretInject: {
      beginDictation() {},
      inject() {
        return { kind: "pasted" as const };
      },
    },
  });

  dictation.start();
  listener?.onReconnected?.();

  expect(dictation.snapshot().error).toBe(
    "Session reconnected. A phrase may have split.",
  );
  expect(dictation.snapshot().status).toBe("listening");

  listener?.onDraft("hel");
  expect(dictation.snapshot().error).toBeNull();
});

test("start passes stored mode into the Session", () => {
  const options: SessionStartOptions[] = [];
  const dictation = createDictation({
    session: {
      start(_next, startOptions) {
        options.push(startOptions ?? {});
      },
      sendPcm() {},
      sendEndOfAudio() {},
      stop() {},
    },
    caretInject: {
      beginDictation() {},
      inject() {
        return { kind: "pasted" as const };
      },
    },
    startOptions: () => ({ mode: "verbatim" }),
  });

  dictation.start();
  expect(options).toEqual([{ mode: "verbatim" }]);
});

test("Stop pastes immediately when there is no Draft left", async () => {
  const { dictation, emitCommit, flushes } = createHarness();

  dictation.start();
  emitCommit("hello world");
  const stopPromise = dictation.stop();

  // No need to wait for onAudioEnded — commits are already ready.
  await stopPromise;
  expect(flushes).toEqual(["hello world"]);
  expect(dictation.snapshot().status).toBe("idle");
});

test("close chime plays as soon as Stop starts, paste chime after Flush", async () => {
  const chimes: string[] = [];
  let listener: SessionListener | undefined;
  const dictation = createDictation({
    session: {
      start(next) {
        listener = next;
      },
      sendPcm() {},
      sendEndOfAudio() {},
      stop() {},
    },
    caretInject: {
      beginDictation() {},
      async inject(_text) {
        await Promise.resolve();
        return { kind: "pasted" as const };
      },
    },
    onChime(kind) {
      chimes.push(kind);
    },
  });

  dictation.start();
  expect(chimes).toEqual(["open"]);
  listener?.onCommit("hello");
  const stopPromise = dictation.stop();
  expect(chimes).toEqual(["open", "close"]);
  listener?.onAudioEnded();
  await stopPromise;
  expect(chimes).toEqual(["open", "close", "paste"]);
});

test("Stop still finishes if the Session never reports audio ended", async () => {
  vi.useFakeTimers();
  const flushes: string[] = [];
  const dictation = createDictation({
    session: {
      start() {},
      sendPcm() {},
      sendEndOfAudio() {},
      stop() {},
    },
    caretInject: {
      beginDictation() {},
      inject(text) {
        flushes.push(text);
        return { kind: "pasted" as const };
      },
    },
    settleTimeoutMs: 500,
  });

  dictation.start();
  const stopPromise = dictation.stop();
  await vi.advanceTimersByTimeAsync(500);
  await stopPromise;

  expect(dictation.snapshot().status).toBe("idle");
  expect(flushes).toEqual([]);
  vi.useRealTimers();
});

test("Stop force-settles a stuck Draft after the settle timeout", async () => {
  vi.useFakeTimers();
  let listener: SessionListener | undefined;
  const flushes: string[] = [];
  const dictation = createDictation({
    session: {
      start(next) {
        listener = next;
      },
      sendPcm() {},
      sendEndOfAudio() {},
      stop() {},
    },
    caretInject: {
      beginDictation() {},
      inject(text) {
        flushes.push(text);
        return { kind: "pasted" as const };
      },
    },
    settleTimeoutMs: 400,
  });

  dictation.start();
  listener?.onCommit("hello");
  listener?.onDraft("wor");
  const stopPromise = dictation.stop();
  await vi.advanceTimersByTimeAsync(400);
  await stopPromise;

  expect(flushes).toEqual(["hello wor"]);
  expect(dictation.snapshot().status).toBe("idle");
  vi.useRealTimers();
});

test("push-to-talk release ends audio so the Draft can finish without Flush", async () => {
  let listener: SessionListener | undefined;
  const flushes: string[] = [];
  const sessionCalls = { endOfAudio: 0, resume: 0 };
  const dictation = createDictation({
    session: {
      start(next) {
        listener = next;
      },
      sendPcm() {},
      sendEndOfAudio() {
        sessionCalls.endOfAudio += 1;
      },
      resume() {
        sessionCalls.resume += 1;
      },
      stop() {},
    },
    caretInject: {
      beginDictation() {},
      inject(text) {
        flushes.push(text);
        return { kind: "pasted" as const };
      },
    },
    isPushToTalk: () => true,
  });

  dictation.start();
  dictation.setTalkHeld(true);
  listener?.onDraft("hello wor");
  dictation.setTalkHeld(false);

  expect(sessionCalls.endOfAudio).toBe(1);
  expect(dictation.snapshot().status).toBe("paused");
  expect(flushes).toEqual([]);
  expect(dictation.snapshot().draft).toBe("hello wor");

  listener?.onCommit("hello world");
  expect(dictation.snapshot()).toMatchObject({
    draft: "",
    commits: ["hello world"],
    status: "paused",
  });
  expect(flushes).toEqual([]);

  dictation.setTalkHeld(true);
  expect(sessionCalls.resume).toBe(1);
  expect(dictation.snapshot().status).toBe("listening");
});

test("push-to-talk starts Overlay paused and only sends PCM while held", async () => {
  let listener: SessionListener | undefined;
  const flushes: string[] = [];
  const pcm: Uint8Array[] = [];
  const dictation = createDictation({
    session: {
      start(next) {
        listener = next;
      },
      sendPcm(chunk) {
        pcm.push(chunk);
      },
      sendEndOfAudio() {
        listener?.onAudioEnded();
      },
      stop() {},
    },
    caretInject: {
      beginDictation() {},
      inject(text) {
        flushes.push(text);
        return { kind: "pasted" as const };
      },
    },
    isPushToTalk: () => true,
  });

  dictation.start();
  expect(dictation.snapshot()).toMatchObject({
    status: "paused",
    overlayVisible: true,
  });
  dictation.sendPcm(new Uint8Array([1, 2]));
  expect(pcm).toEqual([]);

  dictation.setTalkHeld(true);
  expect(dictation.snapshot().status).toBe("listening");
  dictation.sendPcm(new Uint8Array([3, 4]));
  expect(pcm).toHaveLength(1);

  dictation.setTalkHeld(false);
  expect(dictation.snapshot().status).toBe("paused");
  expect(flushes).toEqual([]);

  listener?.onCommit("hello");
  await dictation.stop();
  expect(flushes).toEqual(["hello"]);
});
