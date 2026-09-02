import { expect, test } from "vitest";
import {
  createSessionSettings,
} from "./session-settings";

test("defaults are Smart formatting", () => {
  const settings = createSessionSettings({
    read: () => null,
    write() {},
  });
  expect(settings.get()).toMatchObject({
    micId: "",
    mode: "smart",
    activationMode: "tap",
  });
});

test("save replaces mic and mode for the next Session", () => {
  let stored: ReturnType<ReturnType<typeof createSessionSettings>["get"]> | null =
    null;
  const settings = createSessionSettings({
    read: () => stored,
    write(next) {
      stored = next;
    },
  });

  settings.save({ micId: "mic-2", mode: "verbatim" });
  expect(settings.get()).toMatchObject({
    micId: "mic-2",
    mode: "verbatim",
  });
  expect(stored).toEqual(settings.get());
});
