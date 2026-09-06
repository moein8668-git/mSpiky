import type { FlushResult } from "../caret-inject/paste-first";
import { flushErrorMessage } from "../caret-inject/types";
import type { ChimeKind } from "../audio/chime";
import { SESSION_RECONNECT_NOTE } from "../session/messages";

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
  onReady?(): void;
  onError?(message: string): void;
  onReconnected?(): void;
};

export type TranscriptMode = "smart" | "verbatim";

export type SessionStartOptions = {
  mode?: TranscriptMode;
};

export type SessionAdapter = {
  start(listener: SessionListener, options?: SessionStartOptions): void;
  sendPcm(pcm: Uint8Array): void;
  sendEndOfAudio(): void;
  resume?(): void;
  stop(): void;
};

export type CaretInjectAdapter = {
  beginDictation(): void;
  inject(text: string): FlushResult | Promise<FlushResult>;
};

export function createDictation(adapters: {
  session: SessionAdapter;
  caretInject: CaretInjectAdapter;
  startOptions?: () => SessionStartOptions;
  isPushToTalk?: () => boolean;
  settleTimeoutMs?: number;
  onSnapshotChange?: (snapshot: OverlaySnapshot) => void;
  onFlush?: (text: string, reason: "pause" | "stop") => void;
  onChime?: (kind: ChimeKind) => void;
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
  let pushGated = false;
  let needsResumeAfterTalk = false;
  let settleTimer: ReturnType<typeof setTimeout> | undefined;
  const flushWaiters: Array<() => void> = [];
  const settleTimeoutMs = adapters.settleTimeoutMs ?? 4000;

  function publish() {
    adapters.onSnapshotChange?.(snapshot);
  }

  function chime(kind: ChimeKind) {
    adapters.onChime?.(kind);
  }

  function notifyFlushWaiters() {
    if (pendingFlush !== null) return;
    for (const resolve of flushWaiters.splice(0)) resolve();
  }

  function clearSettleTimer() {
    if (settleTimer) {
      clearTimeout(settleTimer);
      settleTimer = undefined;
    }
  }

  function promoteDraft() {
    const draft = snapshot.draft.trim();
    if (!draft) {
      snapshot = { ...snapshot, draft: "" };
      return;
    }
    snapshot = {
      ...snapshot,
      draft: "",
      commits: [...snapshot.commits, draft],
    };
  }

  function forceSettlePendingFlush() {
    if (!pendingFlush) return;
    // Keep spoken text: promote an unfinished Draft instead of dropping it.
    promoteDraft();
    audioSettled = true;
    void scheduleSettle();
  }

  function armSettleTimeout() {
    clearSettleTimer();
    if (settleTimeoutMs <= 0) {
      forceSettlePendingFlush();
      return;
    }
    settleTimer = setTimeout(() => {
      settleTimer = undefined;
      forceSettlePendingFlush();
    }, settleTimeoutMs);
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
    if (pendingFlush) adapters.onFlush?.(text, pendingFlush);
    const result = await Promise.resolve(adapters.caretInject.inject(text));
    const error = flushErrorMessage(result);
    if (result.kind === "skipped") {
      snapshot = { ...snapshot, error };
      publish();
      return true;
    }
    if (result.kind === "pasted" || result.kind === "clipboard") {
      chime("paste");
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
    clearSettleTimer();
    if (pendingFlush === "pause") {
      snapshot = { ...snapshot, status: "paused" };
    }
    if (pendingFlush === "stop") {
      adapters.session.stop();
      snapshot = idleSnapshot();
      pushGated = false;
    }
    pendingFlush = null;
    publish();
    notifyFlushWaiters();
  }

  const listener: SessionListener = {
    onDraft(text) {
      snapshot = { ...snapshot, draft: text, error: null };
      publish();
    },
    onCommit(text) {
      snapshot = {
        ...snapshot,
        draft: "",
        commits: [...snapshot.commits, text],
        error: null,
      };
      publish();
      void scheduleSettle();
    },
    onAudioEnded() {
      audioSettled = true;
      void scheduleSettle();
    },
    onError(message) {
      clearSettleTimer();
      adapters.session.stop();
      pendingFlush = null;
      pushGated = false;
      snapshot = {
        status: "idle",
        draft: "",
        commits: [],
        error: message,
        overlayVisible: true,
        meter: 0,
      };
      publish();
      notifyFlushWaiters();
    },
    onReconnected() {
      if (snapshot.status !== "listening") return;
      snapshot = { ...snapshot, error: SESSION_RECONNECT_NOTE };
      publish();
    },
  };

  async function stop() {
    if (snapshot.status === "idle") return;
    if (pendingFlush === "stop") return waitForPendingFlush();
    pendingFlush = "stop";
    chime("close");
    // Hide Overlay immediately on close hotkey; Draft/Flush finish in the background.
    snapshot = { ...snapshot, overlayVisible: false };
    publish();

    if (!snapshot.draft) {
      // Text on the Overlay is already committed — paste now instead of waiting
      // for another end-of-audio grace period.
      audioSettled = true;
      void scheduleSettle();
    } else {
      adapters.session.sendEndOfAudio();
      armSettleTimeout();
    }
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
      clearSettleTimer();
      pushGated = adapters.isPushToTalk?.() === true;
      needsResumeAfterTalk = false;
      snapshot = {
        status: pushGated ? "paused" : "listening",
        draft: "",
        commits: [],
        error: null,
        meter: 0,
        overlayVisible: true,
      };
      audioSettled = false;
      adapters.caretInject.beginDictation();
      adapters.session.start(listener, adapters.startOptions?.());
      publish();
      chime("open");
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
    fail(message: string) {
      clearSettleTimer();
      adapters.session.stop();
      pendingFlush = null;
      pushGated = false;
      snapshot = {
        status: "idle",
        draft: "",
        commits: [],
        error: message,
        overlayVisible: true,
        meter: 0,
      };
      publish();
      notifyFlushWaiters();
    },
    pause() {
      if (snapshot.status !== "listening") return Promise.resolve();
      if (pendingFlush !== null) return waitForPendingFlush();
      pendingFlush = "pause";
      adapters.session.sendEndOfAudio();
      armSettleTimeout();
      return waitForPendingFlush();
    },
    resume() {
      if (snapshot.status !== "paused") return;
      audioSettled = false;
      snapshot = { ...snapshot, status: "listening", error: null };
      adapters.session.resume?.();
      publish();
    },
    setTalkHeld(held: boolean) {
      if (!pushGated || snapshot.status === "idle" || pendingFlush !== null) return;
      if (held) {
        if (snapshot.status !== "paused") return;
        audioSettled = false;
        snapshot = { ...snapshot, status: "listening", error: null, meter: 0 };
        if (needsResumeAfterTalk) {
          needsResumeAfterTalk = false;
          adapters.session.resume?.();
        }
        publish();
        chime("talk");
        return;
      }
      if (snapshot.status !== "listening") return;
      snapshot = { ...snapshot, status: "paused", meter: 0 };
      publish();
      // End the utterance so Gemini can finish the Draft → Commit, but do not Flush yet.
      needsResumeAfterTalk = true;
      adapters.session.sendEndOfAudio();
      chime("release");
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
