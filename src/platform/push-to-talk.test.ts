import { test, expect } from "vitest";
import {
  pushToTalkSupportedOnLinux,
  pushToTalkUnavailableMessage,
} from "./push-to-talk";

test("pushToTalkUnavailableMessage explains Linux limitation", () => {
  expect(pushToTalkUnavailableMessage()).toContain("Push-to-talk");
});

test("pushToTalkSupportedOnLinux is false on generic Wayland", () => {
  const prevSession = process.env.XDG_SESSION_TYPE;
  const prevDesktop = process.env.XDG_CURRENT_DESKTOP;
  process.env.XDG_SESSION_TYPE = "wayland";
  process.env.XDG_CURRENT_DESKTOP = "gnome";
  const original = process.platform;
  Object.defineProperty(process, "platform", { value: "linux" });
  expect(pushToTalkSupportedOnLinux()).toBe(false);
  Object.defineProperty(process, "platform", { value: original });
  process.env.XDG_SESSION_TYPE = prevSession;
  process.env.XDG_CURRENT_DESKTOP = prevDesktop;
});
