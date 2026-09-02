import { expect, test } from "vitest";
import {
  clampOverlayPosition,
  defaultOverlayPosition,
  resolveOverlayPosition,
} from "./overlay-position";

const workArea = { x: 0, y: 0, width: 1920, height: 1040 };
const size = { width: 640, height: 72 };

test("default Overlay position sits near the bottom center of the work area", () => {
  expect(defaultOverlayPosition(workArea, size)).toEqual({
    x: 640,
    y: 944,
  });
});

test("clamp keeps the Overlay inside the work area", () => {
  expect(
    clampOverlayPosition({ x: -100, y: 2000 }, workArea, size),
  ).toEqual({
    x: 0,
    y: 968,
  });
});

test("resolve uses a saved position when present", () => {
  expect(resolveOverlayPosition({ x: 120, y: 80 }, workArea, size)).toEqual({
    x: 120,
    y: 80,
  });
});

test("resolve falls back to the default when nothing is saved", () => {
  expect(resolveOverlayPosition(null, workArea, size)).toEqual({
    x: 640,
    y: 944,
  });
});
