import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  screen,
  Tray,
  type MenuItemConstructorOptions,
} from "electron";
import path from "node:path";
import { caretInjectFromPasteFirst } from "../src/dictation/caret-inject-adapter";
import { createDictation } from "../src/dictation/dictation";
import { createGeminiLiveSession } from "../src/session/gemini-live-session";
import { NO_MIC_MESSAGE } from "../src/session/messages";
import {
  createShell,
  type TrayItem,
} from "../src/shell/shell";
import { createStudioCaptions } from "../src/studio/studio-captions";
import { createElectronCaretInject } from "./caret-inject";
import { createElectronKeyStore } from "./secrets/key-store";
import { createElectronSessionSettings } from "./settings/session-settings";
import { createElectronOverlayPositionStore } from "./settings/overlay-position";
import { clampOverlayPosition, resolveOverlayPosition } from "../src/settings/overlay-position";
import { createElectronStudioHistory } from "./history/studio-history";
import { studioHistoryText } from "../src/history/studio-history";
import { connectGeminiLive } from "./session/connect-gemini-live";
import { overlayWindowOptions, studioWindowOptions } from "./window-options";

const DEV_URL = "http://127.0.0.1:5173";

const TRAY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGUlEQVQ4T2P8z8Dwn4EIwDiqYHRtwPgfAKiuB/3XYpGxAAAAAElFTkSuQmCC",
  "base64",
);

const OVERLAY_WIDTH = 640;
const OVERLAY_HEIGHT = 72;

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
  const sessionSettings = createElectronSessionSettings();
  const overlayPosition = createElectronOverlayPositionStore();
  const studioHistory = createElectronStudioHistory();
  const studio = new BrowserWindow(studioWindowOptions(studioPreloadPath));
  const overlay = new BrowserWindow(overlayWindowOptions(preloadPath));
  void studio.loadURL(rendererUrl("studio"));
  void overlay.loadURL(rendererUrl("overlay"));

  const allowMedia = (_webContents: unknown, permission: string, callback?: (allow: boolean) => void) => {
    const allow = permission === "media";
    if (callback) callback(allow);
    return allow;
  };
  studio.webContents.session.setPermissionRequestHandler((wc, permission, callback) => {
    allowMedia(wc, permission, callback);
  });
  studio.webContents.session.setPermissionCheckHandler((_wc, permission) =>
    permission === "media",
  );
  overlay.webContents.session.setPermissionRequestHandler((wc, permission, callback) => {
    allowMedia(wc, permission, callback);
  });
  overlay.webContents.session.setPermissionCheckHandler((_wc, permission) =>
    permission === "media",
  );

  overlay.setAlwaysOnTop(true, "screen-saver");
  overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlay.setIgnoreMouseEvents(true, { forward: true });

  let overlayDragOffset: { x: number; y: number } | null = null;

  function overlaySize() {
    return { width: OVERLAY_WIDTH, height: OVERLAY_HEIGHT };
  }

  function syncOverlayBounds() {
    if (overlay.isDestroyed()) return;
    const saved = overlayPosition.get();
    const anchor = saved ?? { x: 0, y: 0 };
    const display = screen.getDisplayMatching({
      ...anchor,
      ...overlaySize(),
    });
    const point = resolveOverlayPosition(saved, display.workArea, overlaySize());
    overlay.setBounds({ ...point, ...overlaySize() });
  }

  function setOverlayClickThrough(pass: boolean) {
    if (overlay.isDestroyed()) return;
    if (pass) overlay.setIgnoreMouseEvents(true, { forward: true });
    else overlay.setIgnoreMouseEvents(false);
  }

  syncOverlayBounds();

  const liveDeps = {
    getKey() {
      return keyStore.getKey();
    },
    connect: connectGeminiLive,
  };
  const captions = createStudioCaptions({
    session: createGeminiLiveSession(liveDeps),
    onSnapshotChange(snapshot) {
      if (!studio.isDestroyed()) {
        studio.webContents.send("mspiky:studio-captions", snapshot);
      }
    },
  });

  const pasteFirst = createElectronCaretInject();
  let shell: ReturnType<typeof createShell>;
  const dictationCore = createDictation({
    session: createGeminiLiveSession(liveDeps),
    caretInject: caretInjectFromPasteFirst(pasteFirst),
    startOptions() {
      const settings = sessionSettings.get();
      return { mode: settings.mode };
    },
    onFlush(text) {
      appendHistory(text, sessionSettings.get().mode, "overlay");
    },
    onSnapshotChange: () => {
      shell?.refreshOverlay();
    },
  });
  const dictation = {
    ...dictationCore,
    start() {
      captions.stop();
      return dictationCore.start();
    },
  };

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
        syncOverlayBounds();
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
        void dictation.stop();
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
    captions.start({ mode });
    sessionSettings.save({ mode });
  });

  function pushHistoryUpdate() {
    if (!studio.isDestroyed()) {
      studio.webContents.send("mspiky:history-updated");
    }
  }

  function appendHistory(
    text: string,
    mode: "smart" | "verbatim",
    source: "studio" | "overlay",
  ) {
    if (!studioHistory.append(text, mode, source)) return;
    pushHistoryUpdate();
  }

  function stopStudioCaptionsWithHistory() {
    const snapshot = captions.snapshot();
    if (snapshot.status === "idle") return;
    const text = studioHistoryText(snapshot.commits);
    const mode = snapshot.mode;
    captions.stop();
    if (text) appendHistory(text, mode, "studio");
  }

  ipcMain.handle("mspiky:studio-stop", () => {
    stopStudioCaptionsWithHistory();
  });

  ipcMain.handle("mspiky:studio-fail", (_event, message: unknown) => {
    captions.fail(typeof message === "string" ? message : NO_MIC_MESSAGE);
  });

  ipcMain.handle("mspiky:settings-get", () => sessionSettings.get());

  ipcMain.handle("mspiky:settings-save", (_event, value: unknown) => {
    if (!value || typeof value !== "object") return;
    const record = value as Record<string, unknown>;
    sessionSettings.save({
      micId: typeof record.micId === "string" ? record.micId : undefined,
      mode: record.mode === "verbatim" || record.mode === "smart" ? record.mode : undefined,
    });
  });

  ipcMain.handle("mspiky:history-list", () => studioHistory.list());

  ipcMain.handle("mspiky:history-clear", () => {
    studioHistory.clear();
  });

  function asPcm(data: unknown): Uint8Array | null {
    if (data instanceof Uint8Array) return data;
    if (data instanceof ArrayBuffer) return new Uint8Array(data);
    if (Buffer.isBuffer(data)) return new Uint8Array(data);
    return null;
  }

  ipcMain.on("mspiky:studio-pcm", (_event, data: unknown) => {
    const pcm = asPcm(data);
    if (pcm) captions.sendPcm(pcm);
  });

  ipcMain.on("mspiky:overlay-click-through", (event, pass: unknown) => {
    setOverlayClickThrough(pass !== false);
    event.returnValue = true;
  });

  ipcMain.on("mspiky:overlay-drag-start", (_event, screenX: unknown, screenY: unknown) => {
    if (typeof screenX !== "number" || typeof screenY !== "number") return;
    const [x, y] = overlay.getPosition();
    overlayDragOffset = { x: screenX - x, y: screenY - y };
    setOverlayClickThrough(false);
  });

  ipcMain.on("mspiky:overlay-drag-move", (_event, screenX: unknown, screenY: unknown) => {
    if (!overlayDragOffset || typeof screenX !== "number" || typeof screenY !== "number") {
      return;
    }
    const next = {
      x: screenX - overlayDragOffset.x,
      y: screenY - overlayDragOffset.y,
    };
    const display = screen.getDisplayMatching({ ...next, ...overlaySize() });
    const point = clampOverlayPosition(next, display.workArea, overlaySize());
    overlay.setPosition(point.x, point.y);
  });

  ipcMain.on("mspiky:overlay-drag-end", () => {
    overlayDragOffset = null;
    const [x, y] = overlay.getPosition();
    overlayPosition.save({ x, y });
    setOverlayClickThrough(true);
  });

  ipcMain.on("mspiky:overlay-pcm", (_event, data: unknown) => {
    const pcm = asPcm(data);
    if (pcm) dictation.sendPcm(pcm);
  });

  ipcMain.on("mspiky:overlay-mic-fail", () => {
    dictation.fail(NO_MIC_MESSAGE);
  });

  studio.on("close", (event) => {
    if (quitting) return;
    event.preventDefault();
    stopStudioCaptionsWithHistory();
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
