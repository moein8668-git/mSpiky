import type { OverlaySnapshot } from "../dictation/dictation";
import { KEY_MISSING_MESSAGE } from "../secrets/messages";
import { SESSION_RECONNECT_NOTE } from "../session/messages";

export const studioChrome = {
  heading: "Studio",
  body: "Settings, captions, and transcript history.",
  keyHeading: "Key",
  keyBody: "Paste your Key from Google AI Studio to store it.",
  keyPlaceholder: "Your Key",
  keySave: "Save Key",
  keySaved: "Key saved",
  keyMissing: "No Key saved yet",
  captionsHeading: "Captions",
  captionsBody:
    "Studio captions stay in Studio. Overlay Dictation is what Flushes into other apps.",
  captionsPlaceholder: "Captions will appear here.",
  statusReady: "Ready",
  statusConnecting: "Connecting",
  statusListening: "Listening",
  statusError: "Error",
  micLabel: "Microphone",
  micDefault: "System default",
  modeLabel: "Formatting",
  modeSmart: "Smart",
  modeVerbatim: "Verbatim",
  micStart: "Start mic",
  micStop: "Stop",
  historyHeading: "History",
  historyBody:
    "Past Studio captions and Overlay Dictation. Text only; audio is never stored.",
  historyEmpty: "No history yet.",
  historyClear: "Clear history",
  historyCopy: "Copy",
  historySourceStudio: "Studio",
  historySourceOverlay: "Overlay",
  fileHeading: "File transcription",
  fileBody:
    "Play a saved voice file and watch live captions. File audio stays in memory only.",
  filePick: "Choose audio file",
  fileStart: "Transcribe file",
  fileStop: "Stop file",
  fileCopy: "Copy transcript",
  fileSave: "Save transcript",
  settingsHeading: "Dictation",
  settingsBody:
    "The start/stop hotkey always shows the Overlay. In push-to-talk, nothing is transcribed until you hold the talk key — even if another app has focus.",
  activationLabel: "Activation",
  activationTap: "Tap hotkey",
  activationPush: "Push-to-talk (hold)",
  dictationHotkeyLabel: "Start / stop hotkey",
  pushToTalkHotkeyLabel: "Push-to-talk key",
  launchAtLoginLabel: "Launch at login",
  chimesLabel: "Sound chimes",
  chimesHint:
    "Short beeps on Overlay open/close, paste, and push-to-talk press/release. Off by default.",
  pipeHeading: "Pipe",
  pipeBody:
    "Optional SOCKS5 tunnel for Gemini. When enabled, mSpiky never falls back to direct internet.",
  pipeEnabled: "Use Pipe",
  pipeHost: "Host",
  pipePort: "Port",
  pipeUser: "User",
  pipePassword: "Password",
  pipeRemoteDns: "Remote DNS",
  pipeTest: "Test Pipe",
  pipeTestOk: "Pipe reachable",
  pipeTestFail: "Pipe test failed",
  pushToTalkUnavailable:
    "Push-to-talk is not available on this Linux desktop. Use tap activation instead.",
  firstRunHeading: "Welcome to mSpiky",
  firstRunBody: "Set up your Key and microphone before your first Dictation.",
  firstRunKeyStep: "Add your Key",
  firstRunMicStep: "Allow microphone access",
  firstRunAccessibilityStep: "Enable Accessibility (macOS)",
  firstRunPipeStep: "Optional Pipe",
  firstRunFinish: "Finish setup",
  firstRunSkipPipe: "Skip Pipe",
  firstRunOpenAccessibility: "Open Accessibility settings",
};

export const overlayChrome = {
  statusLabel: {
    idle: "Ready",
    listening: "Listening",
    paused: "Hold to talk",
  },
  reconnectNote: SESSION_RECONNECT_NOTE,
};

export const DEFAULT_DICTATION_HOTKEY = "Control+Shift+Space";

export type TrayItem = {
  id: "show-studio" | "start-dictation" | "quit";
  label: string;
};

export type WindowSurface = {
  show(): void;
  hide(): void;
};

export type TraySurface = {
  setMenu(items: TrayItem[]): void;
};

export type AppSurface = {
  quit(): void;
};

export type DictationSurface = {
  start(): void | Promise<void>;
  showKeyMissing(message: string): void;
  pause(): void | Promise<void>;
  resume(): void;
  stop(): void | Promise<void>;
  snapshot(): OverlaySnapshot;
};

export type KeyStoreSurface = {
  hasKey(): boolean;
};

export type StudioNoticeSurface = {
  keyMissing(message: string): void;
};

export type OverlaySnapshotSurface = {
  push(snapshot: OverlaySnapshot): void;
};

export type HotkeySurface = {
  register(chord: string, handler: () => void): void;
};

export type ShellControls = {
  showStudio(): void;
  closeStudio(): void;
  startDictation(): void;
  toggleDictation(): void;
  pauseDictation(): Promise<void>;
  resumeDictation(): void;
  refreshOverlay(): void;
  quit(): void;
  snapshot(): ShellSnapshot;
};

export type ShellSnapshot = {
  studioVisible: boolean;
  overlayVisible: boolean;
  running: boolean;
};

export const TRAY_ITEMS: TrayItem[] = [
  { id: "show-studio", label: "Show Studio" },
  { id: "start-dictation", label: "Start Dictation" },
  { id: "quit", label: "Quit" },
];

export function createShell(adapters: {
  studio: WindowSurface;
  overlay: WindowSurface;
  tray: TraySurface;
  app: AppSurface;
  dictation: DictationSurface;
  keyStore: KeyStoreSurface;
  studioNotice: StudioNoticeSurface;
  overlaySnapshot: OverlaySnapshotSurface;
}): ShellControls {
  adapters.tray.setMenu(TRAY_ITEMS);

  let studioVisible = false;
  let overlayVisible = false;
  let running = true;

  function syncOverlay() {
    const snapshot = adapters.dictation.snapshot();
    if (snapshot.overlayVisible) {
      if (!overlayVisible) {
        adapters.overlay.show();
        overlayVisible = true;
      }
    } else if (overlayVisible) {
      adapters.overlay.hide();
      overlayVisible = false;
    }
    adapters.overlaySnapshot.push(snapshot);
  }

  async function runToggleDictation() {
    const { status } = adapters.dictation.snapshot();
    if (status === "idle") {
      if (!adapters.keyStore.hasKey()) {
        if (studioVisible) {
          adapters.studioNotice.keyMissing(KEY_MISSING_MESSAGE);
        } else {
          adapters.dictation.showKeyMissing(KEY_MISSING_MESSAGE);
          syncOverlay();
        }
        return;
      }
      adapters.dictation.start();
    } else {
      await adapters.dictation.stop();
    }
    syncOverlay();
  }

  return {
    showStudio() {
      studioVisible = true;
      adapters.studio.show();
    },
    closeStudio() {
      studioVisible = false;
      adapters.studio.hide();
    },
    startDictation() {
      void runToggleDictation();
    },
    toggleDictation() {
      void runToggleDictation();
    },
    async pauseDictation() {
      await adapters.dictation.pause();
      syncOverlay();
    },
    resumeDictation() {
      adapters.dictation.resume();
      syncOverlay();
    },
    refreshOverlay() {
      syncOverlay();
    },
    quit() {
      running = false;
      adapters.app.quit();
    },
    snapshot(): ShellSnapshot {
      return {
        studioVisible,
        overlayVisible: adapters.dictation.snapshot().overlayVisible,
        running,
      };
    },
  };
}
