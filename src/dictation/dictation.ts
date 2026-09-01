import type { FlushResult } from "../caret-inject/paste-first";
import { flushErrorMessage } from "../caret-inject/types";

export type OverlayStatus = "idle" | "listening" | "paused";

export type OverlaySnapshot = {
  status: OverlayStatus;
  draft: string;
  commits: string[];
  error: string | null;
  meter: number;
  overlayVisible: boolean;
};

export type SessionListener = {
  onDraft(text: string): void;
  onCommit(text: string): void;
  onAudioEnded(): void;
};

export type SessionAdapter = {
  start(listener: SessionListener): void;
  sendPcm(pcm: Uint8Array): void;
  sendEndOfAudio(): void;
  stop(): void;
};

export type CaretInjectAdapter = {
  beginDictation(): void;
  inject(text: string): FlushResult | Promise<FlushResult>;
};

export function createDictation(adapters: {
  session: SessionAdapter;
  caretInject: CaretInjectAdapter;
  onSnapshotChange?: (snapshot: OverlaySnapshot) => void;
}) {
  const idleSnapshot = (): OverlaySnapshot => ({
    status: "idle",
    draft: "",
    commits: [],
    error: null,
    meter: 0,
    overlayVisible: false,
  });

  let snapshot = idleSnapshot();
  let pendingFlush: "pause" | "stop" | null = null;
  let audioSettled = true;
  const flushWaiters: Array<() => void> = [];

  function publish() {
    adapters.onSnapshotChange?.(snapshot);
  }

  function notifyFlushWaiters() {
    if (pendingFlush !== null) return;
    for (const resolve of flushWaiters.splice(0)) resolve();
  }

  let settleChain = Promise.resolve();

  function scheduleSettle() {
    settleChain = settleChain.then(() => settlePendingFlush());
    return settleChain;
  }

  function waitForPendingFlush(): Promise<void> {
    if (pendingFlush === null) return Promise.resolve();
    return new Promise((resolve) => {
      flushWaiters.push(resolve);
    });
  }

  async function flushIfReady() {
    if (snapshot.draft) return false;
    if (!audioSettled) return false;
    const text = snapshot.commits.join(" ").trim();
    if (!text) {
      snapshot = { ...snapshot, commits: [] };
      publish();
      return true;
    }
    const result = await Promise.resolve(adapters.caretInject.inject(text));
    const error = flushErrorMessage(result);
    if (result.kind === "skipped") {
      snapshot = { ...snapshot, error };
      publish();
      return true;
    }
    snapshot = {
      ...snapshot,
      commits: [],
      error,
    };
    publish();
    return true;
  }

  async function settlePendingFlush() {
    if (!pendingFlush) return;
    if (!(await flushIfReady())) return;
    if (pendingFlush === "pause") {
      snapshot = { ...snapshot, status: "paused" };
    }
    if (pendingFlush === "stop") {
      adapters.session.stop();
      snapshot = idleSnapshot();
    }
    pendingFlush = null;
    publish();
    notifyFlushWaiters();
  }

  const listener: SessionListener = {
    onDraft(text) {
      snapshot = { ...snapshot, draft: text };
      publish();
    },
    onCommit(text) {
      snapshot = {
        ...snapshot,
        draft: "",
        commits: [...snapshot.commits, text],
      };
      publish();
      void scheduleSettle();
    },
    onAudioEnded() {
      audioSettled = true;
      void scheduleSettle();
    },
  };

  async function stop() {
    if (snapshot.status === "idle") return;
    pendingFlush = "stop";
    adapters.session.sendEndOfAudio();
    await waitForPendingFlush();
  }

  function pcmPeak(pcm: Uint8Array): number {
    let peak = 0;
    for (let i = 0; i + 1 < pcm.length; i += 2) {
      const sample = pcm[i] | (pcm[i + 1] << 8);
      const signed = sample > 32767 ? sample - 65536 : sample;
      const level = Math.abs(signed) / 32768;
      if (level > peak) peak = level;
    }
    return peak;
  }

  return {
    start() {
      if (snapshot.status !== "idle") {
        return stop();
      }
      snapshot = {
        status: "listening",
        draft: "",
        commits: [],
        error: null,
        meter: 0,
        overlayVisible: true,
      };
      audioSettled = false;
      adapters.caretInject.beginDictation();
      adapters.session.start(listener);
      publish();
    },
    showKeyMissing(message: string) {
      snapshot = {
        status: "idle",
        draft: "",
        commits: [],
        error: message,
        meter: 0,
        overlayVisible: true,
      };
      publish();
    },
    pause() {
      if (snapshot.status !== "listening") return Promise.resolve();
      pendingFlush = "pause";
      adapters.session.sendEndOfAudio();
      return waitForPendingFlush();
    },
    resume() {
      if (snapshot.status !== "paused") return;
      audioSettled = false;
      snapshot = { ...snapshot, status: "listening", error: null };
      publish();
    },
    stop,
    sendPcm(pcm: Uint8Array) {
      if (snapshot.status === "listening") {
        adapters.session.sendPcm(pcm);
        snapshot = { ...snapshot, meter: pcmPeak(pcm) };
        publish();
      }
    },
    snapshot() {
      return snapshot;
    },
  };
}
