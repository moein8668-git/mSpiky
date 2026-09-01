import { expect, test } from "vitest";
import {
  createSessionSettings,
  type SessionSettings,
} from "./session-settings";

test("defaults are Smart formatting and detect language", () => {
  const settings = createSessionSettings({
    read: () => null,
    write() {},
  });
  expect(settings.get()).toEqual({
    micId: "",
    mode: "smart",
    language: "",
  });
});

test("save replaces mic, mode, and language for the next Session", () => {
  let stored: SessionSettings | null = null;
  const settings = createSessionSettings({
    read: () => stored,
    write(next) {
      stored = next;
    },
  });

  settings.save({ micId: "mic-2", mode: "verbatim", language: "fa-IR" });
  expect(settings.get()).toEqual({
    micId: "mic-2",
    mode: "verbatim",
    language: "fa-IR",
  });
  expect(stored).toEqual(settings.get());
});
