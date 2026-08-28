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
  inject(text: string): void;
};

export function createDictation(adapters: {
  session: SessionAdapter;
  caretInject: CaretInjectAdapter;
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

  function flushIfReady() {
    if (snapshot.draft) return false;
    if (!audioSettled) return false;
    const text = snapshot.commits.join(" ").trim();
    if (text) adapters.caretInject.inject(text);
    snapshot = {
      ...snapshot,
      commits: [],
    };
    return true;
  }

  function settlePendingFlush() {
    if (!pendingFlush) return;
    if (!flushIfReady()) return;
    if (pendingFlush === "pause") {
      snapshot = { ...snapshot, status: "paused" };
    }
    if (pendingFlush === "stop") {
      adapters.session.stop();
      snapshot = idleSnapshot();
    }
    pendingFlush = null;
  }

  const listener: SessionListener = {
    onDraft(text) {
      snapshot = { ...snapshot, draft: text };
    },
    onCommit(text) {
      snapshot = {
        ...snapshot,
        draft: "",
        commits: [...snapshot.commits, text],
      };
      settlePendingFlush();
    },
    onAudioEnded() {
      audioSettled = true;
      settlePendingFlush();
    },
  };

  function stop() {
    if (snapshot.status === "idle") return;
    adapters.session.sendEndOfAudio();
    pendingFlush = "stop";
    settlePendingFlush();
  }

  return {
    start() {
      if (snapshot.status !== "idle") {
        stop();
        return;
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
      adapters.session.start(listener);
    },
    pause() {
      if (snapshot.status !== "listening") return;
      adapters.session.sendEndOfAudio();
      pendingFlush = "pause";
      settlePendingFlush();
    },
    resume() {
      if (snapshot.status !== "paused") return;
      audioSettled = false;
      snapshot = { ...snapshot, status: "listening" };
    },
    stop,
    sendPcm(pcm: Uint8Array) {
      if (snapshot.status === "listening") {
        adapters.session.sendPcm(pcm);
      }
    },
    snapshot() {
      return snapshot;
    },
  };
}
