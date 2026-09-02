import { describe, expect, test } from "vitest";
import {
  DEFAULT_DICTATION_HOTKEY,
  validateHotkey,
  hotkeyToElectron,
} from "./hotkey";

describe("validateHotkey", () => {
  test("accepts default dictation chord", () => {
    expect(validateHotkey(DEFAULT_DICTATION_HOTKEY)).toEqual({ ok: true });
  });

  test("refuses empty chord", () => {
    expect(validateHotkey("")).toMatchObject({ ok: false });
  });

  test("refuses modifier-only chord", () => {
    expect(validateHotkey("Control+Shift")).toMatchObject({ ok: false });
  });

  test("refuses reserved OS chords", () => {
    expect(validateHotkey("Alt+F4")).toMatchObject({ ok: false });
    expect(validateHotkey("Control+Alt+Delete")).toMatchObject({ ok: false });
    expect(validateHotkey("Meta+Q")).toMatchObject({ ok: false });
  });

  test("refuses too many keys", () => {
    expect(validateHotkey("Control+Shift+Alt+Space")).toMatchObject({
      ok: false,
    });
  });
});

describe("hotkeyToElectron", () => {
  test("normalizes space key", () => {
    expect(hotkeyToElectron("Control+Shift+Space")).toBe("Control+Shift+Space");
  });
});
