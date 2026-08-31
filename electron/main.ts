import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  Tray,
  type MenuItemConstructorOptions,
} from "electron";
import path from "node:path";
import { createDemoOverlaySession } from "../src/dictation/demo-overlay-session";
import { createDictation } from "../src/dictation/dictation";
import {
  createShell,
  type TrayItem,
} from "../src/shell/shell";
import { overlayWindowOptions, studioWindowOptions } from "./window-options";

const DEV_URL = "http://127.0.0.1:5173";

const TRAY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGUlEQVQ4T2P8z8Dwn4EIwDiqYHRtwPgfAKiuB/3XYpGxAAAAAElFTkSuQmCC",
  "base64",
);

function rendererUrl(hash: "studio" | "overlay") {
  if (app.isPackaged) {
    return `file://${path.join(__dirname, "../dist/index.html")}#${hash}`;
  }
  return `${DEV_URL}/#${hash}`;
}

void app.whenReady().then(() => {
  const preloadPath = path.join(__dirname, "preload.cjs");
  const studio = new BrowserWindow(studioWindowOptions());
  const overlay = new BrowserWindow(overlayWindowOptions(preloadPath));
  void studio.loadURL(rendererUrl("studio"));
  void overlay.loadURL(rendererUrl("overlay"));

  overlay.setAlwaysOnTop(true, "screen-saver");
  overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  const dictation = createDictation({
    session: createDemoOverlaySession(),
    caretInject: { inject() {} },
  });

  let quitting = false;
  const tray = new Tray(nativeImage.createFromBuffer(TRAY_PNG));
  tray.setToolTip("mSpiky");

  let shell: ReturnType<typeof createShell>;
  shell = createShell({
    studio: {
      show() {
        studio.show();
      },
      hide() {
        studio.hide();
      },
    },
    overlay: {
      show() {
        overlay.showInactive();
      },
      hide() {
        overlay.hide();
      },
    },
    tray: {
      setMenu(items: TrayItem[]) {
        const template: MenuItemConstructorOptions[] = items.map((item) => ({
          label: item.label,
          click() {
            if (item.id === "show-studio") shell.showStudio();
            if (item.id === "start-dictation") shell.startDictation();
            if (item.id === "quit") shell.quit();
          },
        }));
        tray.setContextMenu(Menu.buildFromTemplate(template));
      },
    },
    app: {
      quit() {
        quitting = true;
        globalShortcut.unregisterAll();
        app.quit();
      },
    },
    dictation,
    overlaySnapshot: {
      push(snapshot) {
        if (!overlay.isDestroyed()) {
          overlay.webContents.send("mspiky:overlay-snapshot", snapshot);
        }
      },
    },
    hotkeys: {
      register(chord, handler) {
        globalShortcut.register(chord, handler);
      },
    },
  });

  ipcMain.on("mspiky:overlay-pause", () => {
    shell.pauseDictation();
  });

  ipcMain.on("mspiky:overlay-resume", () => {
    shell.resumeDictation();
  });

  studio.on("close", (event) => {
    if (quitting) return;
    event.preventDefault();
    shell.closeStudio();
  });

  overlay.on("close", (event) => {
    if (quitting) return;
    event.preventDefault();
    overlay.hide();
  });

  app.on("window-all-closed", () => {
    // Stay in the tray. Quit is tray-only.
  });

  shell.showStudio();
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
