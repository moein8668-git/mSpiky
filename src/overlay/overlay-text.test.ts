import { expect, test } from "vitest";
import {
  overlayText,
  overlayTextTail,
  scrollOverlayTextToLatest,
} from "./overlay-text";

test("live Overlay keeps the latest Draft at the end", () => {
  expect(overlayText(["hello", "there"], "wor")).toBe("hello there wor");
});

test("a long Overlay line keeps the newest characters, not the start", () => {
  expect(overlayTextTail("abcdefghij", 4)).toBe("…ghij");
  expect(overlayTextTail("کوتاه", 20)).toBe("کوتاه");
});

test("LTR Overlay text scrolls to the newest words on the right", () => {
  const el = { clientWidth: 80, scrollWidth: 400, scrollLeft: 0, dir: "ltr" };
  scrollOverlayTextToLatest(el);
  expect(el.scrollLeft).toBe(320);
});

test("RTL Overlay text scrolls to the newest words on the left", () => {
  const el = { clientWidth: 80, scrollWidth: 400, scrollLeft: 0, dir: "rtl" };
  scrollOverlayTextToLatest(el);
  expect(el.scrollLeft).toBe(-320);
});
