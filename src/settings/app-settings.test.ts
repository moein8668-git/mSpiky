import { test, expect } from "vitest";
import {
  createAppSettings,
  defaultAppSettings,
  parseAppSettings,
} from "./app-settings";

test("defaults use tap activation and no launch at login", () => {
  expect(defaultAppSettings()).toMatchObject({
    activationMode: "tap",
    launchAtLogin: false,
    chimesEnabled: false,
    firstRunComplete: false,
    pipe: { enabled: false, remoteDns: true },
  });
  expect(defaultAppSettings().pushToTalkHotkey).toBe("F8");
});

test("parseAppSettings keeps unknown-safe defaults", () => {
  expect(parseAppSettings({ micId: "abc", mode: "verbatim" })).toMatchObject({
    micId: "abc",
    mode: "verbatim",
    activationMode: "tap",
  });
});

test("createAppSettings merges partial saves", () => {
  const written: unknown[] = [];
  const settings = createAppSettings({
    read: () => defaultAppSettings(),
    write(value) {
      written.push(value);
    },
  });

  settings.save({ activationMode: "push", launchAtLogin: true });
  expect(settings.get().activationMode).toBe("push");
  expect(settings.get().launchAtLogin).toBe(true);
  expect(written).toHaveLength(1);
});
