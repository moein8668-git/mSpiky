import {
  app,
  BrowserWindow,
  dialog,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  screen,
  shell as electronShell,
  Tray,
  type MenuItemConstructorOptions,
} from "electron";
import path from "node:path";
import fs from "node:fs";
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
import { createElectronSecretStore } from "./secrets/secret-store";
import { createElectronSessionSettings } from "./settings/session-settings";
import { createElectronOverlayPositionStore } from "./settings/overlay-position";
import { clampOverlayPosition, resolveOverlayPosition } from "../src/settings/overlay-position";
import { createElectronStudioHistory } from "./history/studio-history";
import { studioHistoryText } from "../src/history/studio-history";
import {
  connectGeminiLive,
  type PipeConnectConfig,
} from "./session/connect-gemini-live";
import { overlayWindowOptions, studioWindowOptions } from "./window-options";
import {
  OVERLAY_HEIGHT,
  OVERLAY_WIDTH,
  cursorOverOverlayDragHandle,
} from "../src/overlay/overlay-layout";
import { createDictationHotkeys, tryCreateNativeKeyHook } from "./hotkeys/dictation-hotkeys";
import { testSocksReachable } from "./pipe/test-socks";
import { pushToTalkSupportedOnLinux } from "../src/platform/push-to-talk";
import type { LiveConnect } from "../src/session/gemini-live-session";

const DEV_URL = "http://127.0.0.1:5173";

function appIconPath(...parts: string[]) {
  if (app.isPackaged) {
    return path.join(__dirname, "..", ...parts);
  }
  return path.join(app.getAppPath(), ...parts);
}

function loadAppIcon() {
  const candidates = [
    appIconPath("build", "icon.png"),
    appIconPath("mspiky.png"),
  ];
  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;
    const image = nativeImage.createFromPath(candidate);
    if (!image.isEmpty()) return image;
  }
  return null;
}

function loadTrayIcon() {
  const candidates = [
    appIconPath("build", "tray-icon.png"),
    appIconPath("build", "icon.png"),
    appIconPath("mspiky.png"),
  ];
  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;
    const image = nativeImage.createFromPath(candidate);
    if (image.isEmpty()) continue;
    if (process.platform === "win32") {
      return image.resize({ width: 16, height: 16 });
    }
    return image.resize({ width: 22, height: 22 });
  }
  return nativeImage.createEmpty();
}

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
  const pipeSecrets = createElectronSecretStore("pipe-password");
  const appSettings = createElectronSessionSettings();
  const overlayPosition = createElectronOverlayPositionStore();
  const studioHistory = createElectronStudioHistory();
  const appIcon = loadAppIcon();
  const studio = new BrowserWindow({
    ...studioWindowOptions(studioPreloadPath),
    ...(appIcon ? { icon: appIcon } : {}),
  });
  const overlay = new BrowserWindow({
    ...overlayWindowOptions(preloadPath),
    ...(appIcon ? { icon: appIcon } : {}),
  });
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

  let overlayShown = false;
  let overlayLastMovedAt = 0;
  let overlayClampTimer: ReturnType<typeof setTimeout> | null = null;

  let overlayClickThrough = true;
  let overlayMouseTimer: ReturnType<typeof setInterval> | null = null;
  let overlayMoveSaveTimer: ReturnType<typeof setTimeout> | null = null;

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
    if (overlay.isDestroyed() || overlayClickThrough === pass) return;
    overlayClickThrough = pass;
    if (pass) overlay.setIgnoreMouseEvents(true, { forward: true });
    else overlay.setIgnoreMouseEvents(false);
  }

  function syncOverlayMouseCapture() {
    if (overlay.isDestroyed() || !overlay.isVisible()) return;
    if (Date.now() - overlayLastMovedAt < 300) {
      setOverlayClickThrough(false);
      return;
    }
    const [wx, wy] = overlay.getPosition();
    const cursor = screen.getCursorScreenPoint();
    const onHandle = cursorOverOverlayDragHandle(wx, wy, cursor.x, cursor.y);
    setOverlayClickThrough(!onHandle);
  }

  function scheduleOverlayClamp() {
    if (overlayClampTimer) clearTimeout(overlayClampTimer);
    overlayClampTimer = setTimeout(() => {
      if (overlay.isDestroyed()) return;
      const [x, y] = overlay.getPosition();
      const display = screen.getDisplayMatching({ x, y, ...overlaySize() });
      const point = clampOverlayPosition({ x, y }, display.workArea, overlaySize());
      if (point.x !== x || point.y !== y) {
        overlay.setPosition(point.x, point.y);
      }
      overlayLastMovedAt = 0;
    }, 120);
  }

  function startOverlayMouseCapture() {
    if (overlayMouseTimer) return;
    overlayMouseTimer = setInterval(syncOverlayMouseCapture, 32);
    syncOverlayMouseCapture();
  }

  function stopOverlayMouseCapture() {
    if (overlayMouseTimer) {
      clearInterval(overlayMouseTimer);
      overlayMouseTimer = null;
    }
    setOverlayClickThrough(true);
  }

  function scheduleOverlayPositionSave() {
    if (overlayMoveSaveTimer) clearTimeout(overlayMoveSaveTimer);
    overlayMoveSaveTimer = setTimeout(() => {
      if (overlay.isDestroyed()) return;
      const [x, y] = overlay.getPosition();
      overlayPosition.save({ x, y });
    }, 150);
  }

  syncOverlayBounds();

  function getPipeConfig(): PipeConnectConfig | null {
    const settings = appSettings.get();
    if (!settings.pipe.enabled) return null;
    return {
      ...settings.pipe,
      password: pipeSecrets.getKey(),
    };
  }

  const liveConnect: LiveConnect = (options, callbacks) =>
    connectGeminiLive({ ...options, pipe: getPipeConfig() }, callbacks);

  const liveDeps = {
    getKey() {
      return keyStore.getKey();
    },
    connect: liveConnect,
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

  function playOverlayChime(kind: import("../src/audio/chime").ChimeKind) {
    if (!appSettings.get().chimesEnabled) return;
    if (!overlay.isDestroyed()) {
      overlay.webContents.send("mspiky:chime", kind);
    }
  }

  const dictationCore = createDictation({
    session: createGeminiLiveSession({
      ...liveDeps,
      // Brief grace after end-of-audio while a Draft is still finishing.
      audioEndedAfterMs: 600,
    }),
    caretInject: caretInjectFromPasteFirst(pasteFirst),
    startOptions() {
      const settings = appSettings.get();
      return { mode: settings.mode };
    },
    isPushToTalk() {
      return appSettings.get().activationMode === "push";
    },
    onFlush(text) {
      appendHistory(text, appSettings.get().mode, "overlay");
    },
    onChime(kind) {
      playOverlayChime(kind);
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
  const tray = new Tray(loadTrayIcon());
  tray.setToolTip("mSpiky");
  if (process.platform === "darwin" && app.dock && appIcon) {
    app.dock.setIcon(appIcon);
  }

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
        if (overlayShown) return;
        syncOverlayBounds();
        overlay.showInactive();
        startOverlayMouseCapture();
        overlayShown = true;
      },
      hide() {
        if (!overlayShown) return;
        overlay.hide();
        stopOverlayMouseCapture();
        overlayShown = false;
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
        dictationHotkeys.unregisterAll();
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
  });

  function syncLoginItem() {
    const settings = appSettings.get();
    app.setLoginItemSettings({
      openAtLogin: settings.launchAtLogin,
    });
  }

  const dictationHotkeys = createDictationHotkeys({
    getSettings: () => appSettings.get(),
    handlers: {
      toggleDictation: () => {
        shell.toggleDictation();
      },
      pushStart: () => {
        if (dictation.snapshot().status === "idle") return;
        dictation.setTalkHeld(true);
        shell.refreshOverlay();
      },
      pushEnd: () => {
        if (dictation.snapshot().status === "idle") return;
        dictation.setTalkHeld(false);
        shell.refreshOverlay();
      },
    },
  });

  dictationHotkeys.sync();
  syncLoginItem();

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
    appSettings.save({ mode });
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

  ipcMain.handle("mspiky:settings-get", () => appSettings.get());

  ipcMain.handle("mspiky:settings-save", (_event, value: unknown) => {
    if (!value || typeof value !== "object") return;
    appSettings.save(value as Partial<ReturnType<typeof appSettings.get>>);
    dictationHotkeys.sync();
    syncLoginItem();
  });

  ipcMain.handle("mspiky:pipe-password-save", (_event, value: unknown) => {
    if (typeof value !== "string" || !value.trim()) return;
    pipeSecrets.saveKey(value);
  });

  ipcMain.handle("mspiky:pipe-test", async () => {
    const settings = appSettings.get();
    if (!settings.pipe.enabled) {
      return { ok: false, message: "Turn on Pipe first." };
    }
    try {
      await testSocksReachable(settings.pipe.host, settings.pipe.port);
      return { ok: true, message: "Pipe reachable." };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Pipe test failed.",
      };
    }
  });

  ipcMain.handle("mspiky:platform", () => process.platform);

  ipcMain.handle("mspiky:open-accessibility", async () => {
    if (process.platform === "darwin") {
      await electronShell.openExternal(
        "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
      );
    }
  });

  ipcMain.handle("mspiky:first-run-complete", () => {
    appSettings.save({ firstRunComplete: true });
  });

  ipcMain.handle("mspiky:push-to-talk-available", () =>
    pushToTalkSupportedOnLinux() && tryCreateNativeKeyHook() !== null,
  );

  ipcMain.handle("mspiky:studio-save-transcript", async (_event, text: unknown) => {
    if (typeof text !== "string" || !text.trim()) return false;
    const result = await dialog.showSaveDialog(studio, {
      defaultPath: "mspiky-transcript.txt",
      filters: [{ name: "Text", extensions: ["txt"] }],
    });
    if (result.canceled || !result.filePath) return false;
    fs.writeFileSync(result.filePath, text, "utf8");
    return true;
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
    stopOverlayMouseCapture();
    overlayShown = false;
  });

  overlay.on("moved", () => {
    overlayLastMovedAt = Date.now();
    setOverlayClickThrough(false);
    scheduleOverlayPositionSave();
    scheduleOverlayClamp();
  });

  app.on("window-all-closed", () => {
    // Stay in the tray. Quit is tray-only.
  });

  shell.showStudio();
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
