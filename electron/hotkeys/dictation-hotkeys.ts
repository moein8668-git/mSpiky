import { globalShortcut } from "electron";
import type { AppSettings } from "../../src/settings/app-settings";
import { planDictationHotkeys } from "../../src/settings/dictation-hotkey-plan";
import { hotkeyToElectron, matchesHotkey, type HotkeyEvent } from "../../src/settings/hotkey";
import {
  pushToTalkSupportedOnLinux,
  pushToTalkUnavailableMessage,
} from "../../src/platform/push-to-talk";

export type DictationHotkeyHandlers = {
  toggleDictation(): void;
  pushStart(): void;
  pushEnd(): void;
};

export function createDictationHotkeys(deps: {
  getSettings(): AppSettings;
  handlers: DictationHotkeyHandlers;
  tryNativeHook?: () => NativeKeyHook | null;
}) {
  let nativeHook: NativeKeyHook | null = null;
  let pushHeld = false;

  function unregisterAll() {
    globalShortcut.unregisterAll();
    nativeHook?.stop();
    nativeHook = null;
    pushHeld = false;
  }

  function registerTap(chord: string) {
    const electronChord = hotkeyToElectron(chord);
    if (!globalShortcut.register(electronChord, () => {
      deps.handlers.toggleDictation();
    })) {
      throw new Error(`Could not register ${chord}`);
    }
  }

  function registerPush(chord: string) {
    if (!pushToTalkSupportedOnLinux()) {
      return { ok: false as const, reason: pushToTalkUnavailableMessage() };
    }
    const hook = deps.tryNativeHook?.() ?? tryCreateNativeKeyHook();
    if (!hook) {
      return {
        ok: false as const,
        reason:
          "Push-to-talk needs a native key listener that is not available on this build.",
      };
    }
    nativeHook = hook;
    hook.onDown((event) => {
      if (!matchesHotkey(event, chord)) return;
      if (pushHeld) return;
      pushHeld = true;
      deps.handlers.pushStart();
    });
    hook.onUp((event) => {
      if (!matchesHotkey(event, chord)) return;
      if (!pushHeld) return;
      pushHeld = false;
      deps.handlers.pushEnd();
    });
    hook.start();
    return { ok: true as const };
  }

  return {
    sync() {
      unregisterAll();
      const plan = planDictationHotkeys(deps.getSettings());
      registerTap(plan.toggleChord);
      if (plan.pushChord) {
        registerPush(plan.pushChord);
      }
    },
    unregisterAll,
    pushToTalkUnavailableReason() {
      if (!pushToTalkSupportedOnLinux()) return pushToTalkUnavailableMessage();
      return null;
    },
  };
}

type NativeKeyEvent = HotkeyEvent;

export type NativeKeyHook = {
  start(): void;
  stop(): void;
  onDown(handler: (event: NativeKeyEvent) => void): void;
  onUp(handler: (event: NativeKeyEvent) => void): void;
};

function normalizeUiohookKey(name: string) {
  const lower = name.replace(/^VC_/, "").toLowerCase();
  if (lower === "ctrl" || lower === "ctrlright") return "control";
  if (lower === "shiftright") return "shift";
  if (lower === "alt" || lower === "altright" || lower === "altgr") return "alt";
  if (lower === "meta" || lower === "metaright" || lower === "win" || lower === "command") {
    return "meta";
  }
  return lower;
}

export function tryCreateNativeKeyHook(): NativeKeyHook | null {
  try {
    // Optional native dependency; tap mode still works when this is missing.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { uIOhook, UiohookKey } = require("uiohook-napi") as {
      uIOhook: {
        on(
          event: string,
          handler: (event: {
            keycode: number;
            ctrlKey?: boolean;
            shiftKey?: boolean;
            altKey?: boolean;
            metaKey?: boolean;
          }) => void,
        ): void;
        start(): void;
        stop(): void;
      };
      UiohookKey: Record<string, number>;
    };
    let downHandler: ((event: NativeKeyEvent) => void) | null = null;
    let upHandler: ((event: NativeKeyEvent) => void) | null = null;
    const keyNameByCode = new Map<number, string>();
    for (const [name, code] of Object.entries(UiohookKey)) {
      keyNameByCode.set(code, normalizeUiohookKey(name));
    }

    return {
      start() {
        uIOhook.on("keydown", (event) => {
          downHandler?.({
            key: keyNameByCode.get(event.keycode) ?? String(event.keycode),
            ctrlKey: event.ctrlKey === true,
            shiftKey: event.shiftKey === true,
            altKey: event.altKey === true,
            metaKey: event.metaKey === true,
          });
        });
        uIOhook.on("keyup", (event) => {
          upHandler?.({
            key: keyNameByCode.get(event.keycode) ?? String(event.keycode),
            ctrlKey: event.ctrlKey === true,
            shiftKey: event.shiftKey === true,
            altKey: event.altKey === true,
            metaKey: event.metaKey === true,
          });
        });
        uIOhook.start();
      },
      stop() {
        uIOhook.stop();
      },
      onDown(handler) {
        downHandler = handler;
      },
      onUp(handler) {
        upHandler = handler;
      },
    };
  } catch {
    return null;
  }
}
