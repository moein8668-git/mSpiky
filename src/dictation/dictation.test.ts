import { expect, test } from "vitest";
import { createDictation } from "./dictation";
import type { SessionListener } from "./dictation";
import { createFakeSession } from "./fake-session";

function createHarness() {
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
      inject(text) {
        flushes.push(text);
      },
    },
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
    caretInject: { inject() {} },
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

test("Pause Flushes accumulated Commits and keeps Dictation alive", () => {
  const { dictation, emitCommit, flushes, sessionCalls } = createHarness();

  dictation.start();
  emitCommit("hello");
  emitCommit("world");
  dictation.pause();

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

test("Pause does not Flush while a Draft is still moving", () => {
  const { dictation, emitDraft, emitCommit, flushes } = createHarness();

  dictation.start();
  emitCommit("hello");
  emitDraft("wor");
  dictation.pause();

  expect(flushes).toEqual([]);
  expect(dictation.snapshot().overlayVisible).toBe(true);

  emitCommit("world");

  expect(flushes).toEqual(["hello world"]);
  expect(dictation.snapshot().draft).toBe("");
  expect(dictation.snapshot().commits).toEqual([]);
  expect(dictation.snapshot().status).toBe("paused");
});

test("Resume continues the same Dictation Session", () => {
  const { dictation, emitCommit, flushes, sessionCalls } = createHarness();

  dictation.start();
  emitCommit("hello");
  dictation.pause();
  dictation.resume();
  emitCommit("again");
  dictation.pause();

  expect(sessionCalls.start).toBe(1);
  expect(sessionCalls.stop).toBe(0);
  expect(dictation.snapshot().status).toBe("paused");
  expect(dictation.snapshot().overlayVisible).toBe(true);
  expect(flushes).toEqual(["hello", "again"]);
});

test("Stop Flushes then ends Dictation and hides Overlay", () => {
  const { dictation, emitCommit, flushes, sessionCalls } = createHarness();

  dictation.start();
  emitCommit("hello");
  dictation.stop();

  expect(flushes).toEqual(["hello"]);
  expect(dictation.snapshot()).toMatchObject({
    status: "idle",
    overlayVisible: false,
    draft: "",
    commits: [],
  });
  expect(sessionCalls.endOfAudio).toBe(1);
  expect(sessionCalls.stop).toBe(1);
});

test("a second start while Dictation is live Stops instead of opening another", () => {
  const { dictation, emitCommit, flushes, sessionCalls } = createHarness();

  dictation.start();
  emitCommit("hello");
  dictation.start();

  expect(flushes).toEqual(["hello"]);
  expect(dictation.snapshot().overlayVisible).toBe(false);
  expect(sessionCalls.start).toBe(1);
  expect(sessionCalls.stop).toBe(1);
});

test("Stop does not Flush while a Draft is still moving", () => {
  const { dictation, emitDraft, emitCommit, flushes, sessionCalls } =
    createHarness();

  dictation.start();
  emitCommit("hello");
  emitDraft("wor");
  dictation.stop();

  expect(flushes).toEqual([]);
  expect(dictation.snapshot().overlayVisible).toBe(true);
  expect(sessionCalls.stop).toBe(0);

  emitCommit("world");

  expect(flushes).toEqual(["hello world"]);
  expect(dictation.snapshot().overlayVisible).toBe(false);
  expect(sessionCalls.stop).toBe(1);
});

test("PCM is sent to the Session only while listening", () => {
  const { dictation, sessionCalls } = createHarness();
  const live = new Uint8Array([1, 2]);
  const paused = new Uint8Array([3]);

  dictation.start();
  dictation.sendPcm(live);
  dictation.pause();
  dictation.sendPcm(paused);

  expect(sessionCalls.pcm).toEqual([live]);
});

test("Dictation has no Cancel or discard path", () => {
  const { dictation } = createHarness();
  expect(dictation).not.toHaveProperty("cancel");
  expect(dictation).not.toHaveProperty("discard");
});

test("Stop is a no-op when Dictation is idle", () => {
  const { dictation, flushes, sessionCalls } = createHarness();

  dictation.stop();

  expect(flushes).toEqual([]);
  expect(sessionCalls.stop).toBe(0);
  expect(sessionCalls.endOfAudio).toBe(0);
  expect(dictation.snapshot().overlayVisible).toBe(false);
});

test("Pause includes a last Commit that arrives after end-of-audio", () => {
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
      inject(text) {
        flushes.push(text);
      },
    },
  });

  dictation.start();
  listener?.onCommit("hello");
  dictation.pause();
  listener?.onCommit("world");
  listener?.onAudioEnded();

  expect(flushes).toEqual(["hello world"]);
  expect(dictation.snapshot().status).toBe("paused");
});
