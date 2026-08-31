import type { FlushResult } from "../caret-inject/paste-first";
import type { CaretInjectAdapter } from "./dictation";

export function caretInjectFromPasteFirst(pasteFirst: {
  beginDictation(): void;
  flush(text: string): Promise<FlushResult>;
}): CaretInjectAdapter {
  return {
    beginDictation() {
      pasteFirst.beginDictation();
    },
    inject(text) {
      return pasteFirst.flush(text);
    },
  };
}
