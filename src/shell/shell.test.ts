import { expect, test } from "vitest";
import {
  createShell,
  DEFAULT_DICTATION_HOTKEY,
  overlayChrome,
  studioChrome,
} from "./shell";
import type { OverlaySnapshot } from "../dictation/dictation";

function idleSnapshot(): OverlaySnapshot {
  return {
    status: "idle",
    draft: "",
    commits: [],
    error: null,
    meter: 0,
    overlayVisible: false,
  };
}

function listeningSnapshot(
  partial: Partial<OverlaySnapshot> = {},
): OverlaySnapshot {
  return {
    status: "listening",
    draft: "",
    commits: [],
    error: null,
    meter: 0,
    overlayVisible: true,
    ...partial,
  };
}

function createHarness() {
  const shown = { studio: false, overlay: false };
  const quitCalls: number[] = [];
  const dictationCalls = { start: 0, pause: 0, resume: 0, stop: 0 };
  const pushed: OverlaySnapshot[] = [];
  let menu: { id: string; label: string }[] = [];
  let snapshot = idleSnapshot();
  let hotkeyHandler: (() => void) | undefined;

  const shell = createShell({
    studio: {
      show() {
        shown.studio = true;
      },
      hide() {
        shown.studio = false;
      },
    },
    overlay: {
      show() {
        shown.overlay = true;
      },
      hide() {
        shown.overlay = false;
      },
    },
    tray: {
      setMenu(items) {
        menu = items;
      },
    },
    app: {
      quit() {
        quitCalls.push(1);
      },
    },
    dictation: {
      start() {
        dictationCalls.start += 1;
        snapshot = listeningSnapshot();
      },
      pause() {
        dictationCalls.pause += 1;
        snapshot = { ...snapshot, status: "paused" };
      },
      resume() {
        dictationCalls.resume += 1;
        snapshot = { ...snapshot, status: "listening" };
      },
      stop() {
        dictationCalls.stop += 1;
        snapshot = idleSnapshot();
      },
      snapshot() {
        return snapshot;
      },
    },
    overlaySnapshot: {
      push(next) {
        pushed.push(next);
      },
    },
    hotkeys: {
      register(chord, handler) {
        if (chord === DEFAULT_DICTATION_HOTKEY) hotkeyHandler = handler;
      },
    },
  });

  return {
    shell,
    shown,
    quitCalls,
    dictationCalls,
    pushed,
    getMenu: () => menu,
    hotkey: () => hotkeyHandler?.(),
  };
}

test("tray items are Show Studio, Start Dictation, and Quit", () => {
  const { getMenu } = createHarness();

  expect(getMenu()).toEqual([
    { id: "show-studio", label: "Show Studio" },
    { id: "start-dictation", label: "Start Dictation" },
    { id: "quit", label: "Quit" },
  ]);
});

test("registers the default Dictation hotkey", () => {
  const { hotkey } = createHarness();
  expect(hotkey).toBeTypeOf("function");
});

test("Dictation hotkey starts Dictation and shows Overlay", () => {
  const { hotkey, shown, dictationCalls, pushed } = createHarness();

  hotkey();

  expect(dictationCalls.start).toBe(1);
  expect(shown.overlay).toBe(true);
  expect(pushed.at(-1)?.status).toBe("listening");
});

test("a second Dictation hotkey tap Stops and hides Overlay", () => {
  const { hotkey, shown, dictationCalls } = createHarness();

  hotkey();
  hotkey();

  expect(dictationCalls.start).toBe(1);
  expect(dictationCalls.stop).toBe(1);
  expect(shown.overlay).toBe(false);
});

test("tray Start Dictation toggles Dictation like the hotkey", () => {
  const { shell, dictationCalls, shown } = createHarness();

  shell.startDictation();
  expect(dictationCalls.start).toBe(1);
  expect(shown.overlay).toBe(true);

  shell.startDictation();
  expect(dictationCalls.stop).toBe(1);
  expect(shown.overlay).toBe(false);
});

test("Pause keeps Overlay visible", () => {
  const { shell, hotkey, shown, dictationCalls } = createHarness();

  hotkey();
  shell.pauseDictation();

  expect(dictationCalls.pause).toBe(1);
  expect(shown.overlay).toBe(true);
  expect(shell.snapshot().overlayVisible).toBe(true);
});

test("closing Studio hides it and leaves mSpiky running", () => {
  const { shell, shown, quitCalls } = createHarness();

  shell.showStudio();
  shell.closeStudio();

  expect(shown.studio).toBe(false);
  expect(shell.snapshot()).toMatchObject({
    studioVisible: false,
    running: true,
  });
  expect(quitCalls).toEqual([]);
});

test("Start Dictation shows the Overlay", () => {
  const { shell, shown } = createHarness();

  shell.startDictation();

  expect(shown.overlay).toBe(true);
  expect(shell.snapshot().overlayVisible).toBe(true);
});

test("Quit from the tray exits mSpiky", () => {
  const { shell, quitCalls } = createHarness();

  shell.quit();

  expect(quitCalls).toEqual([1]);
  expect(shell.snapshot().running).toBe(false);
});

test("closing Studio does not hide an open Overlay", () => {
  const { shell, shown } = createHarness();

  shell.startDictation();
  shell.closeStudio();

  expect(shown.overlay).toBe(true);
  expect(shell.snapshot()).toMatchObject({
    overlayVisible: true,
    running: true,
  });
});

test("Studio and Overlay chrome is English", () => {
  expect(studioChrome.heading).toBe("Studio");
  expect(studioChrome.body).toBe(
    "Settings, files, and history will live here.",
  );
  expect(overlayChrome.statusLabel.listening).toBe("Listening");
});
