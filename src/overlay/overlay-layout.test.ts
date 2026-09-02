import { describe, expect, test } from "vitest";
import {
  cursorOverOverlayDragHandle,
  overlayDragHandleScreenRect,
  pointInScreenRect,
} from "./overlay-layout";

test("drag handle rect is anchored to overlay window", () => {
  expect(overlayDragHandleScreenRect(100, 200)).toEqual({
    x: 108,
    y: 200,
    width: 52,
    height: 72,
  });
});

test("pointInScreenRect matches inclusive top-left and exclusive bottom-right", () => {
  const rect = { x: 10, y: 20, width: 30, height: 40 };
  expect(pointInScreenRect(10, 20, rect)).toBe(true);
  expect(pointInScreenRect(39, 59, rect)).toBe(true);
  expect(pointInScreenRect(40, 60, rect)).toBe(false);
});

describe("cursorOverOverlayDragHandle", () => {
  test("true inside handle", () => {
    expect(cursorOverOverlayDragHandle(0, 0, 20, 30)).toBe(true);
  });

  test("false outside handle", () => {
    expect(cursorOverOverlayDragHandle(0, 0, 80, 30)).toBe(false);
  });
});
