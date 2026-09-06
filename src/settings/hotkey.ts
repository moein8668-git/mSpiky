export const DEFAULT_DICTATION_HOTKEY = "Control+Shift+Space";
export const DEFAULT_PUSH_TO_TALK_HOTKEY = "F8";

const RESERVED = new Set([
  "alt+f4",
  "control+alt+delete",
  "meta+q",
  "command+q",
  "control+shift+escape",
  "meta+tab",
  "alt+tab",
]);

const MODIFIERS = new Set([
  "control",
  "ctrl",
  "shift",
  "alt",
  "meta",
  "command",
  "cmd",
  "super",
]);

export type HotkeyValidation =
  | { ok: true }
  | { ok: false; reason: string };

function normalizePart(part: string) {
  const lower = part.trim().toLowerCase();
  if (lower === "ctrl") return "control";
  if (lower === "cmd" || lower === "command") return "meta";
  if (lower === "super") return "meta";
  return lower;
}

export function parseHotkey(chord: string) {
  return chord
    .split("+")
    .map((part) => normalizePart(part))
    .filter(Boolean);
}

export function hotkeyToElectron(chord: string) {
  return parseHotkey(chord)
    .map((part) => {
      if (part === "control") return "Control";
      if (part === "shift") return "Shift";
      if (part === "alt") return "Alt";
      if (part === "meta") return process.platform === "darwin" ? "Command" : "Super";
      if (part === "space") return "Space";
      return part.length === 1 ? part.toUpperCase() : part[0]!.toUpperCase() + part.slice(1);
    })
    .join("+");
}

export function validateHotkey(chord: string): HotkeyValidation {
  const trimmed = chord.trim();
  if (!trimmed) {
    return { ok: false, reason: "Choose a hotkey." };
  }

  const parts = parseHotkey(trimmed);
  if (parts.length < 2) {
    return { ok: false, reason: "Add a modifier plus a key." };
  }

  const nonModifiers = parts.filter((part) => !MODIFIERS.has(part));
  if (nonModifiers.length === 0) {
    return { ok: false, reason: "Modifier-only chords are reserved by the OS." };
  }

  if (parts.length > 3) {
    return { ok: false, reason: "Use at most two modifiers plus one key." };
  }

  if (RESERVED.has(parts.join("+"))) {
    return { ok: false, reason: "That chord is reserved by the OS." };
  }

  return { ok: true };
}

export function validatePushHotkey(chord: string): HotkeyValidation {
  const trimmed = chord.trim();
  if (!trimmed) {
    return { ok: false, reason: "Choose a push-to-talk key." };
  }

  const parts = parseHotkey(trimmed);
  if (RESERVED.has(parts.join("+"))) {
    return { ok: false, reason: "That chord is reserved by the OS." };
  }

  if (parts.length === 1) {
    return { ok: true };
  }

  return validateHotkey(chord);
}

export type HotkeyEvent = {
  key: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
};

export function matchesHotkey(event: HotkeyEvent, chord: string): boolean {
  const parts = parseHotkey(chord);
  if (parts.length === 0) return false;

  const eventKey = normalizePart(event.key);
  const keyPart = parts.find((part) => !MODIFIERS.has(part));
  if (!keyPart) {
    return parts.length === 1 && eventKey === parts[0];
  }

  const wantsCtrl = parts.includes("control");
  const wantsShift = parts.includes("shift");
  const wantsAlt = parts.includes("alt");
  const wantsMeta = parts.includes("meta");
  return (
    event.ctrlKey === wantsCtrl &&
    event.shiftKey === wantsShift &&
    event.altKey === wantsAlt &&
    event.metaKey === wantsMeta &&
    eventKey === keyPart
  );
}
