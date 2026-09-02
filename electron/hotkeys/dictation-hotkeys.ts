import { globalShortcut } from "electron";
import type { AppSettings } from "../../src/settings/app-settings";
import { hotkeyToElectron, validateHotkey } from "../../src/settings/hotkey";
import {
  pushToTalkSupportedOnLinux,
  pushToTalkUnavailableMessage,
} from "../../src/platform/push-to-talk";

export type DictationHotkeyHandlers = {
  toggleDictation(): void;
  pushStart(): void;
  pushEnd(): void;
  pauseDictation(): void;
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

  function registerPause(chord: string) {
    if (!chord.trim()) return;
    const validation = validateHotkey(chord);
    if (!validation.ok) return;
    const electronChord = hotkeyToElectron(chord);
    globalShortcut.register(electronChord, () => {
      deps.handlers.pauseDictation();
    });
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
    const parts = chord.split("+").map((part) => part.trim().toLowerCase());
    const keyPart = parts.find(
      (part) => !["control", "ctrl", "shift", "alt", "meta", "command", "cmd", "super"].includes(part),
    );
    if (!keyPart) {
      return { ok: false as const, reason: "Choose a key for push-to-talk." };
    }
    hook.onDown((event) => {
      if (!matchesChord(event, parts)) return;
      if (pushHeld) return;
      pushHeld = true;
      deps.handlers.pushStart();
    });
    hook.onUp((event) => {
      if (!matchesChord(event, parts)) return;
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
      const settings = deps.getSettings();
      const dictation = settings.dictationHotkey;
      const validation = validateHotkey(dictation);
      if (!validation.ok) {
        registerTap("Control+Shift+Space");
      } else if (settings.activationMode === "push") {
        const push = registerPush(dictation);
        if (!push.ok) {
          registerTap(dictation);
        }
      } else {
        registerTap(dictation);
      }
      registerPause(settings.pauseHotkey);
    },
    unregisterAll,
    pushToTalkUnavailableReason() {
      if (!pushToTalkSupportedOnLinux()) return pushToTalkUnavailableMessage();
      return null;
    },
  };
}

type NativeKeyEvent = {
  key: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
};

export type NativeKeyHook = {
  start(): void;
  stop(): void;
  onDown(handler: (event: NativeKeyEvent) => void): void;
  onUp(handler: (event: NativeKeyEvent) => void): void;
};

function matchesChord(event: NativeKeyEvent, parts: string[]) {
  const wantsCtrl = parts.includes("control") || parts.includes("ctrl");
  const wantsShift = parts.includes("shift");
  const wantsAlt = parts.includes("alt");
  const wantsMeta =
    parts.includes("meta") ||
    parts.includes("command") ||
    parts.includes("cmd") ||
    parts.includes("super");
  const keyPart = parts.find(
    (part) =>
      !["control", "ctrl", "shift", "alt", "meta", "command", "cmd", "super"].includes(
        part,
      ),
  );
  if (!keyPart) return false;
  return (
    event.ctrlKey === wantsCtrl &&
    event.shiftKey === wantsShift &&
    event.altKey === wantsAlt &&
    event.metaKey === wantsMeta &&
    event.key.toLowerCase() === keyPart
  );
}

export function tryCreateNativeKeyHook(): NativeKeyHook | null {
  try {
    // Optional native dependency; tap mode still works when this is missing.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { uIOhook, UiohookKey } = require("uiohook-napi") as {
      uIOhook: {
        on(event: string, handler: (event: { keycode: number }) => void): void;
        start(): void;
        stop(): void;
      };
      UiohookKey: Record<string, number>;
    };
    let downHandler: ((event: NativeKeyEvent) => void) | null = null;
    let upHandler: ((event: NativeKeyEvent) => void) | null = null;
    const keyNameByCode = new Map<number, string>();
    for (const [name, code] of Object.entries(UiohookKey)) {
      keyNameByCode.set(code, name.replace(/^VC_/, "").toLowerCase());
    }

    return {
      start() {
        uIOhook.on("keydown", (event) => {
          downHandler?.({
            key: keyNameByCode.get(event.keycode) ?? String(event.keycode),
            ctrlKey: false,
            shiftKey: false,
            altKey: false,
            metaKey: false,
          });
        });
        uIOhook.on("keyup", (event) => {
          upHandler?.({
            key: keyNameByCode.get(event.keycode) ?? String(event.keycode),
            ctrlKey: false,
            shiftKey: false,
            altKey: false,
            metaKey: false,
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
