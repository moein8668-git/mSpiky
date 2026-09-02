import { expect, test } from "vitest";
import {
  createSessionSettings,
  type SessionSettings,
} from "./session-settings";

test("defaults are Smart formatting", () => {
  const settings = createSessionSettings({
    read: () => null,
    write() {},
  });
  expect(settings.get()).toEqual({
    micId: "",
    mode: "smart",
  });
});

test("save replaces mic and mode for the next Session", () => {
  let stored: SessionSettings | null = null;
  const settings = createSessionSettings({
    read: () => stored,
    write(next) {
      stored = next;
    },
  });

  settings.save({ micId: "mic-2", mode: "verbatim" });
  expect(settings.get()).toEqual({
    micId: "mic-2",
    mode: "verbatim",
  });
  expect(stored).toEqual(settings.get());
});
