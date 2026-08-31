import { expect, test } from "vitest";
import { createPasteFirstCaretInject } from "./paste-first";

function createHarness(options?: {
  canPaste?: boolean;
  passwordField?: boolean;
  terminal?: boolean;
  targetChanges?: boolean;
}) {
  const clipboard = { saved: "", current: "prior clip", writes: [] as string[] };
  const primary = { saved: "", current: "prior primary", writes: [] as string[] };
  let capturedTarget = "notepad";
  let currentTarget = "notepad";
  const pasteAttempts: string[] = [];

  const inject = createPasteFirstCaretInject({
    clipboard: {
      read() {
        return clipboard.current;
      },
      write(text) {
        clipboard.writes.push(text);
        clipboard.current = text;
      },
      restore(text) {
        clipboard.current = text;
      },
    },
    primarySelection: {
      read() {
        return primary.current;
      },
      write(text) {
        primary.writes.push(text);
        primary.current = text;
      },
      restore(text) {
        primary.current = text;
      },
    },
    target: {
      capture() {
        capturedTarget = currentTarget;
        return capturedTarget;
      },
      current() {
        return currentTarget;
      },
    },
    paste: {
      canPaste() {
        return options?.canPaste ?? true;
      },
      paste() {
        pasteAttempts.push("paste");
      },
    },
    context: {
      isPasswordField() {
        return options?.passwordField ?? false;
      },
      isTerminal() {
        return options?.terminal ?? false;
      },
    },
  });

  return {
    inject,
    clipboard,
    primary,
    pasteAttempts,
    setTarget(id: string) {
      currentTarget = id;
    },
  };
}

test("paste-first saves clipboard, pastes, then restores clipboard", async () => {
  const { inject, clipboard, pasteAttempts } = createHarness();

  inject.beginDictation();
  const result = await inject.flush("hello");

  expect(result).toEqual({ kind: "pasted" });
  expect(pasteAttempts).toEqual(["paste"]);
  expect(clipboard.writes).toEqual(["hello"]);
  expect(clipboard.current).toBe("prior clip");
});

test("clipboard fallback when paste cannot run", async () => {
  const { inject, clipboard, pasteAttempts } = createHarness({ canPaste: false });

  inject.beginDictation();
  const result = await inject.flush("hello");

  expect(result).toEqual({
    kind: "clipboard",
    message: "Could not paste at the caret. Text is on the clipboard.",
  });
  expect(pasteAttempts).toEqual([]);
  expect(clipboard.current).toBe("hello");
});

test("terminal Flush replaces newlines with spaces", async () => {
  const { inject, clipboard } = createHarness({ terminal: true });

  inject.beginDictation();
  await inject.flush("line one\nline two");

  expect(clipboard.writes).toEqual(["line one line two"]);
});

test("Flush is skipped when the target window changed", async () => {
  const { inject, clipboard, pasteAttempts, setTarget } = createHarness();

  inject.beginDictation();
  setTarget("other-app");
  const result = await inject.flush("hello");

  expect(result).toEqual({ kind: "skipped", reason: "target-changed" });
  expect(pasteAttempts).toEqual([]);
  expect(clipboard.writes).toEqual([]);
});

test("Flush is skipped in password fields", async () => {
  const { inject, pasteAttempts } = createHarness({ passwordField: true });

  inject.beginDictation();
  const result = await inject.flush("secret");

  expect(result).toEqual({ kind: "skipped", reason: "password-field" });
  expect(pasteAttempts).toEqual([]);
});

test("Flushes run one at a time", async () => {
  const order: string[] = [];
  const inject = createPasteFirstCaretInject({
    clipboard: {
      read: () => "",
      write(text) {
        order.push(`write:${text}`);
      },
      restore() {
        order.push("restore");
      },
    },
    primarySelection: {
      read: () => "",
      write() {},
      restore() {},
    },
    target: {
      capture: () => "app",
      current: () => "app",
    },
    paste: {
      canPaste: () => true,
      paste() {
        order.push("paste");
      },
    },
    context: {
      isPasswordField: () => false,
      isTerminal: () => false,
    },
  });

  inject.beginDictation();
  const first = inject.flush("one");
  const second = inject.flush("two");
  await Promise.all([first, second]);

  expect(order).toEqual([
    "write:one",
    "paste",
    "restore",
    "write:two",
    "paste",
    "restore",
  ]);
});
