import { expect, test } from "vitest";
import { createGeminiLiveSession } from "./gemini-live-session";
import type { GeminiShapedEvent } from "../dictation/map-gemini-event";
import { KEY_MISSING_MESSAGE } from "../secrets/messages";
import { INVALID_KEY_MESSAGE } from "./messages";

function createHarness(options?: { key?: string | null }) {
  const drafts: string[] = [];
  const commits: string[] = [];
  const errors: string[] = [];
  const pcm: Uint8Array[] = [];
  const reconnects: number[] = [];
  const audioEnded: number[] = [];
  let ready = 0;
  let connectCalls: Array<{ mode: string; apiKey: string }> =
    [];
  let emitEvent: ((event: GeminiShapedEvent) => void) | undefined;
  let failConnect: ((message: string) => void) | undefined;
  let closeConnect: (() => void) | undefined;

  const session = createGeminiLiveSession({
    getKey() {
      return options?.key === undefined ? "test-key" : options.key;
    },
    audioEndedAfterMs: 0,
    async connect(opts, callbacks) {
      connectCalls.push({
        mode: opts.mode,
        apiKey: opts.apiKey,
      });
      emitEvent = callbacks.onEvent;
      failConnect = callbacks.onError;
      closeConnect = () => callbacks.onClose("timeout");
      return {
        sendPcm(chunk) {
          pcm.push(chunk);
        },
        sendEndOfAudio() {},
        close() {},
      };
    },
  });

  session.start(
    {
      onDraft(text) {
        drafts.push(text);
      },
      onCommit(text) {
        commits.push(text);
      },
      onAudioEnded() {
        audioEnded.push(1);
      },
      onReady() {
        ready += 1;
      },
      onError(message) {
        errors.push(message);
      },
      onReconnected() {
        reconnects.push(1);
      },
    },
    { mode: "smart" },
  );

  return {
    session,
    drafts,
    commits,
    errors,
    pcm,
    ready: () => ready,
    connectCalls: () => connectCalls,
    async settleConnect() {
      await Promise.resolve();
      await Promise.resolve();
    },
    emit(event: GeminiShapedEvent) {
      emitEvent?.(event);
    },
    fail(message: string) {
      failConnect?.(message);
    },
    drop() {
      closeConnect?.();
    },
    reconnects: () => reconnects,
    audioEnded: () => audioEnded,
  };
}

test("interim Gemini payloads become Drafts", async () => {
  const { emit, drafts, settleConnect } = createHarness();
  await settleConnect();
  emit({ type: "interim", text: "hel" });
  expect(drafts).toEqual(["hel"]);
});

test("finished false is a Draft and finished true is a Commit", async () => {
  const { emit, drafts, commits, settleConnect } = createHarness();
  await settleConnect();
  emit({ finished: false, text: "hel" });
  emit({ finished: true, text: "hello" });
  expect(drafts).toEqual(["hel"]);
  expect(commits).toEqual(["hello"]);
});

test("start without a Key errors and does not connect", async () => {
  const harness = createHarness({ key: null });
  await harness.settleConnect();
  expect(harness.errors).toEqual([KEY_MISSING_MESSAGE]);
  expect(harness.connectCalls()).toEqual([]);
});

test("invalid Key from Gemini is a visible error", async () => {
  const { fail, errors, settleConnect } = createHarness();
  await settleConnect();
  fail("API key not valid. Please pass a valid API key.");
  expect(errors).toEqual([INVALID_KEY_MESSAGE]);
});

test("mode is sent at connect, not later", async () => {
  const { settleConnect, connectCalls } = createHarness();
  await settleConnect();
  expect(connectCalls()).toEqual([
    { mode: "smart", apiKey: "test-key" },
  ]);
});

test("PCM sent before connect is forwarded once live", async () => {
  const { session, pcm, settleConnect } = createHarness();
  const chunk = new Uint8Array([1, 2]);
  session.sendPcm(chunk);
  expect(pcm).toEqual([]);
  await settleConnect();
  expect(pcm).toEqual([chunk]);
});

test("an unexpected close reconnects instead of dying", async () => {
  const harness = createHarness();
  await harness.settleConnect();
  expect(harness.connectCalls()).toHaveLength(1);

  harness.drop();
  await harness.settleConnect();

  expect(harness.connectCalls()).toHaveLength(2);
  expect(harness.reconnects()).toEqual([1]);
  expect(harness.errors).toEqual([]);
});

test("stop prevents reconnect after close", async () => {
  const harness = createHarness();
  await harness.settleConnect();
  harness.session.stop();
  harness.drop();
  await harness.settleConnect();
  expect(harness.connectCalls()).toHaveLength(1);
  expect(harness.reconnects()).toEqual([]);
});

test("end-of-audio close waits for resume instead of reconnecting", async () => {
  const harness = createHarness();
  await harness.settleConnect();
  harness.session.sendEndOfAudio();
  harness.drop();
  await harness.settleConnect();
  expect(harness.connectCalls()).toHaveLength(1);
  expect(harness.reconnects()).toEqual([]);

  harness.session.resume?.();
  await harness.settleConnect();
  expect(harness.connectCalls()).toHaveLength(2);
  expect(harness.reconnects()).toEqual([]);
});

test("end-of-audio tells Dictation audio has settled so Flush can run", async () => {
  const harness = createHarness();
  await harness.settleConnect();
  harness.session.sendEndOfAudio();
  await Promise.resolve();
  expect(harness.audioEnded()).toEqual([1]);
});
