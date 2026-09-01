import type { BrowserWindowConstructorOptions } from "electron";

function linuxOverlayType(): BrowserWindowConstructorOptions["type"] {
  const desktop = (process.env.XDG_CURRENT_DESKTOP ?? "").toLowerCase();
  if (desktop.includes("kde") || desktop.includes("plasma")) {
    return "notification";
  }
  if (desktop.includes("xfce")) {
    return "toolbar";
  }
  return "toolbar";
}

export function overlayWindowOptions(
  preloadPath: string,
): BrowserWindowConstructorOptions {
  const linux = process.platform === "linux";
  const mac = process.platform === "darwin";

  return {
    width: 520,
    height: 72,
    frame: false,
    transparent: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    focusable: false,
    fullscreenable: false,
    maximizable: false,
    minimizable: false,
    resizable: false,
    hasShadow: false,
    show: false,
    hiddenInMissionControl: true,
    acceptFirstMouse: true,
    type: linux ? linuxOverlayType() : mac ? "panel" : undefined,
    webPreferences: {
      preload: preloadPath,
      backgroundThrottling: false,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  };
}

export function studioWindowOptions(
  preloadPath: string,
): BrowserWindowConstructorOptions {
  return {
    width: 720,
    height: 780,
    title: "mSpiky",
    show: false,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  };
}
