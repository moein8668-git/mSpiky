import type { OverlaySnapshot } from "../dictation/dictation";
import { KEY_MISSING_MESSAGE } from "../secrets/messages";
import { SESSION_RECONNECT_NOTE } from "../session/messages";

export const studioChrome = {
  heading: "Studio",
  body: "Settings, files, and history will live here.",
  keyHeading: "Key",
  keyBody:
    "Paste your Key from Google AI Studio. mSpiky stores it in the OS secret store on this machine.",
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
  languageLabel: "Spoken language",
  micStart: "Start mic",
  micStop: "Stop",
};

export const overlayChrome = {
  statusLabel: {
    idle: "Ready",
    listening: "Listening",
    paused: "Paused",
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
  hotkeys: HotkeySurface;
}) {
  adapters.tray.setMenu(TRAY_ITEMS);

  let studioVisible = false;
  let running = true;

  function syncOverlay() {
    const snapshot = adapters.dictation.snapshot();
    if (snapshot.overlayVisible) adapters.overlay.show();
    else adapters.overlay.hide();
    adapters.overlaySnapshot.push(snapshot);
  }

  async function toggleDictation() {
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

  adapters.hotkeys.register(DEFAULT_DICTATION_HOTKEY, () => {
    void toggleDictation();
  });

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
      void toggleDictation();
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
