import { expect, test } from "vitest";
import { mapGeminiEvent } from "./map-gemini-event";

test("an interim event is a Draft", () => {
  expect(mapGeminiEvent({ type: "interim", text: "hel" })).toEqual({
    kind: "draft",
    text: "hel",
  });
});

test("finished false is a Draft", () => {
  expect(mapGeminiEvent({ finished: false, text: "hel" })).toEqual({
    kind: "draft",
    text: "hel",
  });
});

test("finished not false is a Commit", () => {
  expect(mapGeminiEvent({ finished: true, text: "hello" })).toEqual({
    kind: "commit",
    text: "hello",
  });
});

test("omitted finished is a Commit", () => {
  expect(mapGeminiEvent({ text: "hello" })).toEqual({
    kind: "commit",
    text: "hello",
  });
});
