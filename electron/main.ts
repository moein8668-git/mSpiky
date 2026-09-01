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
import { caretInjectFromPasteFirst } from "../src/dictation/caret-inject-adapter";
import { createDictation } from "../src/dictation/dictation";
import { createGeminiLiveSession } from "../src/session/gemini-live-session";
import {
  createShell,
  type TrayItem,
} from "../src/shell/shell";
import { createStudioCaptions } from "../src/studio/studio-captions";
import { createElectronCaretInject } from "./caret-inject";
import { createElectronKeyStore } from "./secrets/key-store";
import { connectGeminiLive } from "./session/connect-gemini-live";
import { overlayWindowOptions, studioWindowOptions } from "./window-options";
import { NO_MIC_MESSAGE } from "../src/session/messages";

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
  const studioPreloadPath = path.join(__dirname, "preload-studio.cjs");
  const keyStore = createElectronKeyStore();
  const studio = new BrowserWindow(studioWindowOptions(studioPreloadPath));
  const overlay = new BrowserWindow(overlayWindowOptions(preloadPath));
  void studio.loadURL(rendererUrl("studio"));
  void overlay.loadURL(rendererUrl("overlay"));

  studio.webContents.session.setPermissionRequestHandler(
    (_webContents, permission, callback) => {
      callback(permission === "media");
    },
  );
  studio.webContents.session.setPermissionCheckHandler(
    (_webContents, permission) => permission === "media",
  );

  overlay.setAlwaysOnTop(true, "screen-saver");
  overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  const liveSession = createGeminiLiveSession({
    getKey() {
      return keyStore.getKey();
    },
    connect: connectGeminiLive,
  });
  const captions = createStudioCaptions({
    session: liveSession,
    onSnapshotChange(snapshot) {
      if (!studio.isDestroyed()) {
        studio.webContents.send("mspiky:studio-captions", snapshot);
      }
    },
  });

  const pasteFirst = createElectronCaretInject();
  let shell: ReturnType<typeof createShell>;
  const dictation = createDictation({
    session: createDemoOverlaySession(),
    caretInject: caretInjectFromPasteFirst(pasteFirst),
    onSnapshotChange: () => {
      shell?.refreshOverlay();
    },
  });

  let quitting = false;
  const tray = new Tray(nativeImage.createFromBuffer(TRAY_PNG));
  tray.setToolTip("mSpiky");

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
        captions.stop();
        globalShortcut.unregisterAll();
        app.quit();
      },
    },
    dictation,
    keyStore,
    studioNotice: {
      keyMissing(message) {
        if (!studio.isDestroyed()) {
          studio.webContents.send("mspiky:studio-key-missing", message);
        }
      },
    },
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

  ipcMain.handle("mspiky:key-has", () => keyStore.hasKey());

  ipcMain.handle("mspiky:key-save", (_event, value: unknown) => {
    if (typeof value !== "string") {
      throw new Error("Key must be a string");
    }
    keyStore.saveKey(value);
  });

  ipcMain.handle("mspiky:studio-start", (_event, options: unknown) => {
    const mode =
      options &&
      typeof options === "object" &&
      "mode" in options &&
      options.mode === "verbatim"
        ? "verbatim"
        : "smart";
    const language =
      options &&
      typeof options === "object" &&
      "language" in options &&
      typeof options.language === "string"
        ? options.language
        : "";
    captions.start({ mode, language });
  });

  ipcMain.handle("mspiky:studio-stop", () => {
    captions.stop();
  });

  ipcMain.handle("mspiky:studio-fail", (_event, message: unknown) => {
    captions.fail(typeof message === "string" ? message : NO_MIC_MESSAGE);
  });

  ipcMain.on("mspiky:studio-pcm", (_event, data: unknown) => {
    if (data instanceof Uint8Array) {
      captions.sendPcm(data);
      return;
    }
    if (data instanceof ArrayBuffer) {
      captions.sendPcm(new Uint8Array(data));
      return;
    }
    if (Buffer.isBuffer(data)) {
      captions.sendPcm(new Uint8Array(data));
    }
  });

  studio.on("close", (event) => {
    if (quitting) return;
    event.preventDefault();
    captions.stop();
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
