import { expect, test } from "vitest";
import { defaultAppSettings } from "./app-settings";
import { planDictationHotkeys } from "./dictation-hotkey-plan";

test("tap mode only plans the toggle hotkey", () => {
  expect(planDictationHotkeys(defaultAppSettings())).toEqual({
    toggleChord: "Control+Shift+Space",
    pushChord: null,
  });
});

test("push mode plans a separate talk key", () => {
  expect(
    planDictationHotkeys({
      ...defaultAppSettings(),
      activationMode: "push",
      pushToTalkHotkey: "F8",
    }),
  ).toEqual({
    toggleChord: "Control+Shift+Space",
    pushChord: "F8",
  });
});

test("push mode drops a talk key that clashes with toggle", () => {
  expect(
    planDictationHotkeys({
      ...defaultAppSettings(),
      activationMode: "push",
      dictationHotkey: "Control+Shift+Space",
      pushToTalkHotkey: "Control+Shift+Space",
    }),
  ).toEqual({
    toggleChord: "Control+Shift+Space",
    pushChord: null,
  });
});
