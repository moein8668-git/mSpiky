import { expect, test } from "vitest";
import { createStudioCaptions } from "./studio-captions";
import type { SessionListener, SessionStartOptions } from "../dictation/dictation";
import { INVALID_KEY_MESSAGE, NO_MIC_MESSAGE } from "../session/messages";

function createHarness() {
  let listener: SessionListener | undefined;
  const sessionCalls = {
    start: 0,
    stop: 0,
    endOfAudio: 0,
    pcm: [] as Uint8Array[],
    options: [] as SessionStartOptions[],
  };

  const captions = createStudioCaptions({
    session: {
      start(next, options) {
        sessionCalls.start += 1;
        sessionCalls.options.push(options ?? {});
        listener = next;
      },
      sendPcm(pcm) {
        sessionCalls.pcm.push(pcm);
      },
      sendEndOfAudio() {
        sessionCalls.endOfAudio += 1;
      },
      stop() {
        sessionCalls.stop += 1;
      },
    },
  });

  return {
    captions,
    sessionCalls,
    emitDraft(text: string) {
      listener?.onDraft(text);
    },
    emitCommit(text: string) {
      listener?.onCommit(text);
    },
    emitError(message: string) {
      listener?.onError?.(message);
    },
    emitReady() {
      listener?.onReady?.();
    },
  };
}

test("mic start shows live Drafts then Commits and never Flushes", () => {
  const { captions, emitDraft, emitCommit } = createHarness();

  captions.start();
  expect(captions.snapshot()).toMatchObject({
    status: "connecting",
    draft: "",
    commits: [],
    error: null,
  });
  expect(captions).not.toHaveProperty("flush");
  expect(captions).not.toHaveProperty("inject");

  emitDraft("hel");
  expect(captions.snapshot().draft).toBe("hel");
  expect(captions.snapshot().status).toBe("listening");

  emitCommit("hello");
  expect(captions.snapshot()).toMatchObject({
    status: "listening",
    draft: "",
    commits: ["hello"],
  });
});

test("invalid Key is a visible error instead of idle captions", () => {
  const { captions, emitError, sessionCalls } = createHarness();

  captions.start();
  emitError(INVALID_KEY_MESSAGE);

  expect(captions.snapshot()).toMatchObject({
    status: "error",
    error: INVALID_KEY_MESSAGE,
    draft: "",
  });
  expect(sessionCalls.stop).toBe(1);
});

test("missing mic is a visible error and does not leave captions idle", () => {
  const { captions, sessionCalls } = createHarness();

  captions.fail(NO_MIC_MESSAGE);

  expect(captions.snapshot()).toMatchObject({
    status: "error",
    error: NO_MIC_MESSAGE,
  });
  expect(sessionCalls.start).toBe(0);
});

test("Smart is the default and settings apply at the next start", () => {
  const { captions, sessionCalls } = createHarness();

  captions.start();
  expect(sessionCalls.options[0]).toEqual({ mode: "smart", language: "" });

  captions.stop();
  captions.start({ mode: "verbatim", language: "fa-IR" });
  expect(sessionCalls.options[1]).toEqual({
    mode: "verbatim",
    language: "fa-IR",
  });
});

test("changing language while listening waits until the next start", () => {
  const { captions, sessionCalls } = createHarness();

  captions.start({ mode: "smart", language: "en-US" });
  captions.start({ mode: "verbatim", language: "fa-IR" });

  expect(sessionCalls.start).toBe(1);
  expect(sessionCalls.options).toEqual([{ mode: "smart", language: "en-US" }]);

  captions.stop();
  captions.start({ mode: "verbatim", language: "fa-IR" });
  expect(sessionCalls.options[1]).toEqual({
    mode: "verbatim",
    language: "fa-IR",
  });
});

test("Stop ends the Session without Flush", () => {
  const { captions, emitCommit, sessionCalls } = createHarness();

  captions.start();
  emitCommit("hello");
  captions.stop();

  expect(sessionCalls.endOfAudio).toBe(1);
  expect(sessionCalls.stop).toBe(1);
  expect(captions.snapshot()).toMatchObject({
    status: "idle",
    commits: ["hello"],
    draft: "",
    error: null,
  });
});
