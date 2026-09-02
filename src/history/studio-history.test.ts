import { expect, test } from "vitest";
import {
  createStudioHistory,
  studioHistoryText,
  type StudioHistoryEntry,
} from "./studio-history";

test("studioHistoryText joins Commits into one line", () => {
  expect(studioHistoryText(["hello", "world"])).toBe("hello world");
  expect(studioHistoryText(["  ", ""])).toBe("");
});

test("append stores a finished Studio caption session newest first", () => {
  let stored: StudioHistoryEntry[] = [];
  const history = createStudioHistory({
    read: () => stored,
    write(entries) {
      stored = entries;
    },
    now: () => "2026-09-02T10:00:00.000Z",
    id: () => "entry-1",
  });

  const entry = history.append("hello world", "smart", "overlay");

  expect(entry).toEqual({
    id: "entry-1",
    text: "hello world",
    mode: "smart",
    source: "overlay",
    createdAt: "2026-09-02T10:00:00.000Z",
  });
  expect(history.list()).toEqual([entry]);
});

test("append skips empty transcript text", () => {
  let stored: StudioHistoryEntry[] = [];
  const history = createStudioHistory({
    read: () => stored,
    write(entries) {
      stored = entries;
    },
    id: () => "entry-1",
  });

  expect(history.append("   ", "verbatim")).toBeNull();
  expect(history.list()).toEqual([]);
});

test("clear removes every History entry", () => {
  let stored: StudioHistoryEntry[] = [
    {
      id: "a",
      text: "one",
      mode: "smart",
      source: "studio",
      createdAt: "2026-09-02T10:00:00.000Z",
    },
  ];
  const history = createStudioHistory({
    read: () => stored,
    write(entries) {
      stored = entries;
    },
  });

  history.clear();
  expect(history.list()).toEqual([]);
});
