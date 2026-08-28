import { expect, test } from "vitest";
import { createShell, overlayChrome, studioChrome } from "./shell";

function createHarness() {
  const shown = { studio: false, overlay: false };
  const quitCalls: number[] = [];
  let menu: { id: string; label: string }[] = [];
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
  });
  return { shell, shown, quitCalls, getMenu: () => menu };
}

test("tray items are Show Studio, Start Dictation, and Quit", () => {
  const { getMenu } = createHarness();

  expect(getMenu()).toEqual([
    { id: "show-studio", label: "Show Studio" },
    { id: "start-dictation", label: "Start Dictation" },
    { id: "quit", label: "Quit" },
  ]);
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
  expect(overlayChrome.status).toBe("Ready");
});
