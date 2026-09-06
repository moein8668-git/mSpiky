import { describe, expect, test } from "vitest";
import {
  DEFAULT_DICTATION_HOTKEY,
  DEFAULT_PUSH_TO_TALK_HOTKEY,
  validateHotkey,
  validatePushHotkey,
  hotkeyToElectron,
  matchesHotkey,
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

describe("validatePushHotkey", () => {
  test("accepts a single key", () => {
    expect(validatePushHotkey(DEFAULT_PUSH_TO_TALK_HOTKEY)).toEqual({ ok: true });
  });

  test("accepts a held modifier", () => {
    expect(validatePushHotkey("Control")).toEqual({ ok: true });
  });

  test("refuses reserved chords", () => {
    expect(validatePushHotkey("Alt+Tab")).toMatchObject({ ok: false });
  });
});

describe("matchesHotkey", () => {
  test("matches a single key", () => {
    expect(
      matchesHotkey(
        { key: "f8", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false },
        "F8",
      ),
    ).toBe(true);
  });

  test("matches a chord with modifiers", () => {
    expect(
      matchesHotkey(
        { key: "space", ctrlKey: true, shiftKey: true, altKey: false, metaKey: false },
        DEFAULT_DICTATION_HOTKEY,
      ),
    ).toBe(true);
  });
});
