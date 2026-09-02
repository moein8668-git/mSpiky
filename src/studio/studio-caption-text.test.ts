import { test, expect } from "vitest";
import { studioCaptionText } from "./studio-caption-text";

test("studioCaptionText joins commits and draft", () => {
  expect(
    studioCaptionText({ commits: ["hello"], draft: "wor" }),
  ).toBe("hello wor");
});
