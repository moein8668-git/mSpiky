import type {
  SessionAdapter,
  SessionStartOptions,
  TranscriptMode,
} from "../dictation/dictation";

export type StudioCaptionStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "error";

export type StudioCaptionSnapshot = {
  status: StudioCaptionStatus;
  draft: string;
  commits: string[];
  error: string | null;
  mode: TranscriptMode;
  language: string;
};

export function createStudioCaptions(adapters: {
  session: SessionAdapter;
  onSnapshotChange?: (snapshot: StudioCaptionSnapshot) => void;
}) {
  const idleSnapshot = (): StudioCaptionSnapshot => ({
    status: "idle",
    draft: "",
    commits: [],
    error: null,
    mode: "smart",
    language: "",
  });

  let snapshot = idleSnapshot();
  let liveOptions: SessionStartOptions = { mode: "smart", language: "" };

  function publish() {
    adapters.onSnapshotChange?.(snapshot);
  }

  const listener = {
    onDraft(text: string) {
      if (snapshot.status === "idle") return;
      snapshot = {
        ...snapshot,
        status: "listening",
        draft: text,
        error: null,
      };
      publish();
    },
    onCommit(text: string) {
      if (snapshot.status === "idle") return;
      snapshot = {
        ...snapshot,
        status: "listening",
        draft: "",
        commits: [...snapshot.commits, text],
        error: null,
      };
      publish();
    },
    onAudioEnded() {},
    onReady() {
      if (snapshot.status === "connecting") {
        snapshot = { ...snapshot, status: "listening" };
        publish();
      }
    },
    onError(message: string) {
      adapters.session.stop();
      snapshot = {
        ...snapshot,
        status: "error",
        draft: "",
        error: message,
      };
      publish();
    },
  };

  return {
    start(options?: SessionStartOptions) {
      if (snapshot.status === "connecting" || snapshot.status === "listening") {
        return;
      }
      liveOptions = {
        mode: options?.mode === "verbatim" ? "verbatim" : "smart",
        language: options?.language ?? "",
      };
      snapshot = {
        status: "connecting",
        draft: "",
        commits: [],
        error: null,
        mode: liveOptions.mode ?? "smart",
        language: liveOptions.language ?? "",
      };
      publish();
      adapters.session.start(listener, liveOptions);
    },
    stop() {
      if (snapshot.status === "idle") return;
      adapters.session.sendEndOfAudio();
      adapters.session.stop();
      snapshot = {
        status: "idle",
        draft: "",
        commits: snapshot.commits,
        error: null,
        mode: snapshot.mode,
        language: snapshot.language,
      };
      publish();
    },
    fail(message: string) {
      adapters.session.stop();
      snapshot = {
        ...snapshot,
        status: "error",
        draft: "",
        error: message,
      };
      publish();
    },
    sendPcm(pcm: Uint8Array) {
      if (snapshot.status !== "listening" && snapshot.status !== "connecting") {
        return;
      }
      adapters.session.sendPcm(pcm);
    },
    snapshot() {
      return snapshot;
    },
  };
}
