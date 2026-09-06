export type FlushResult =
  | { kind: "pasted" }
  | { kind: "clipboard"; message: string }
  | { kind: "skipped"; reason: "target-changed" | "password-field" };

export type ClipboardPort = {
  read(): string | Promise<string>;
  write(text: string): void | Promise<void>;
  restore(text: string): void | Promise<void>;
};

export type PrimarySelectionPort = {
  read(): string | Promise<string>;
  write(text: string): void | Promise<void>;
  restore(text: string): void | Promise<void>;
};

export type TargetPort = {
  capture(): string | Promise<string>;
  current(): string | Promise<string>;
};

export type PastePort = {
  canPaste(): boolean;
  paste(): void | Promise<void>;
};

export type InjectContextPort = {
  isPasswordField(): boolean;
  isTerminal(): boolean;
};

function sanitizeForTerminal(text: string): string {
  return text.replace(/\r?\n/g, " ");
}

export function createPasteFirstCaretInject(deps: {
  clipboard: ClipboardPort;
  primarySelection: PrimarySelectionPort;
  target: TargetPort;
  paste: PastePort;
  context: InjectContextPort;
}) {
  let capturedTarget: string | null = null;
  let captureReady = Promise.resolve();
  let chain = Promise.resolve();

  function enqueue<T>(work: () => Promise<T> | T): Promise<T> {
    const next = chain.then(work);
    chain = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  return {
    beginDictation() {
      captureReady = Promise.resolve(deps.target.capture()).then((target) => {
        capturedTarget = target;
      });
    },
    flush(text: string): Promise<FlushResult> {
      return enqueue(async () => {
        await captureReady;
        if (!text.trim()) return { kind: "pasted" as const };
        if (deps.context.isPasswordField()) {
          return { kind: "skipped" as const, reason: "password-field" };
        }
        const currentTarget = await Promise.resolve(deps.target.current());
        if (capturedTarget && currentTarget !== capturedTarget) {
          return { kind: "skipped" as const, reason: "target-changed" };
        }

        const flushText = deps.context.isTerminal()
          ? sanitizeForTerminal(text)
          : text;

        const savedClipboard = await Promise.resolve(deps.clipboard.read());
        const savedPrimary = await Promise.resolve(deps.primarySelection.read());

        if (!deps.paste.canPaste()) {
          await Promise.resolve(deps.clipboard.write(flushText));
          return {
            kind: "clipboard" as const,
            message: "Could not paste at the caret. Text is on the clipboard.",
          };
        }

        await Promise.resolve(deps.clipboard.write(flushText));
        await Promise.resolve(deps.paste.paste());
        await Promise.resolve(deps.clipboard.restore(savedClipboard));
        await Promise.resolve(deps.primarySelection.restore(savedPrimary));

        return { kind: "pasted" as const };
      });
    },
  };
}
