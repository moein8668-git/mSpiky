import type { AppSettings } from "./app-settings";
import {
  DEFAULT_DICTATION_HOTKEY,
  parseHotkey,
  validateHotkey,
  validatePushHotkey,
} from "./hotkey";

export function planDictationHotkeys(
  settings: Pick<AppSettings, "activationMode" | "dictationHotkey" | "pushToTalkHotkey">,
): { toggleChord: string; pushChord: string | null } {
  const toggle = validateHotkey(settings.dictationHotkey).ok
    ? settings.dictationHotkey
    : DEFAULT_DICTATION_HOTKEY;

  if (settings.activationMode !== "push") {
    return { toggleChord: toggle, pushChord: null };
  }

  const push = settings.pushToTalkHotkey;
  if (!validatePushHotkey(push).ok) {
    return { toggleChord: toggle, pushChord: null };
  }

  if (parseHotkey(push).join("+") === parseHotkey(toggle).join("+")) {
    return { toggleChord: toggle, pushChord: null };
  }

  return { toggleChord: toggle, pushChord: push };
}
