import type { OverlaySnapshot } from "../dictation/dictation";

export const studioChrome = {
  heading: "Studio",
  body: "Settings, files, and history will live here.",
  overlayPauseNote:
    typeof process !== "undefined" && process.platform === "linux"
      ? "On some Linux desktops, use a Pause hotkey instead of clicking Pause on the Overlay."
      : null,
};

export const overlayChrome = {
  statusLabel: {
    idle: "Ready",
    listening: "Listening",
    paused: "Paused",
  },
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
  start(): void;
  pause(): void;
  resume(): void;
  stop(): void;
  snapshot(): OverlaySnapshot;
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

  function toggleDictation() {
    const { status } = adapters.dictation.snapshot();
    if (status === "idle") adapters.dictation.start();
    else adapters.dictation.stop();
    syncOverlay();
  }

  adapters.hotkeys.register(DEFAULT_DICTATION_HOTKEY, toggleDictation);

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
      toggleDictation();
    },
    pauseDictation() {
      adapters.dictation.pause();
      syncOverlay();
    },
    resumeDictation() {
      adapters.dictation.resume();
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
