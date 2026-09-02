import type { TranscriptMode } from "../dictation/dictation";

export type StudioHistoryEntry = {
  id: string;
  text: string;
  mode: TranscriptMode;
  createdAt: string;
};

export function studioHistoryText(commits: string[]) {
  return commits.join(" ").trim();
}

export function createStudioHistory(deps: {
  read(): StudioHistoryEntry[];
  write(entries: StudioHistoryEntry[]): void;
  now?: () => string;
  id?: () => string;
  maxEntries?: number;
}) {
  const now = deps.now ?? (() => new Date().toISOString());
  const id = deps.id ?? (() => crypto.randomUUID());
  const maxEntries = deps.maxEntries ?? 100;

  return {
    list(): StudioHistoryEntry[] {
      return deps.read();
    },
    append(text: string, mode: TranscriptMode) {
      const trimmed = text.trim();
      if (!trimmed) return null;
      const entry: StudioHistoryEntry = {
        id: id(),
        text: trimmed,
        mode,
        createdAt: now(),
      };
      const next = [entry, ...deps.read()].slice(0, maxEntries);
      deps.write(next);
      return entry;
    },
    clear() {
      deps.write([]);
    },
  };
}
