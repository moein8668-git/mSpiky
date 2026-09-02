import { expect, test } from "vitest";
import { sessionTranscriptionConfig } from "./session-transcription-config";

test("Session connect config only sends mode to Gemini", () => {
  expect(sessionTranscriptionConfig("smart")).toEqual({ mode: "smart" });
  expect(sessionTranscriptionConfig("verbatim")).toEqual({ mode: "verbatim" });
  expect(sessionTranscriptionConfig("smart")).not.toHaveProperty("languageCodes");
});
