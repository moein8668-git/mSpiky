export const studioChrome = {
  heading: "Studio",
  body: "Settings, files, and history will live here.",
};

export const overlayChrome = {
  status: "Ready",
};

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
}) {
  adapters.tray.setMenu(TRAY_ITEMS);

  let studioVisible = false;
  let overlayVisible = false;
  let running = true;

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
      overlayVisible = true;
      adapters.overlay.show();
    },
    quit() {
      running = false;
      adapters.app.quit();
    },
    snapshot(): ShellSnapshot {
      return { studioVisible, overlayVisible, running };
    },
  };
}
