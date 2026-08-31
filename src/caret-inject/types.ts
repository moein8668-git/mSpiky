import type { FlushResult } from "./paste-first";

export function flushErrorMessage(result: FlushResult): string | null {
  if (result.kind === "clipboard") return result.message;
  if (result.kind === "skipped" && result.reason === "target-changed") {
    return "Target window changed. Flush skipped.";
  }
  if (result.kind === "skipped" && result.reason === "password-field") {
    return "Password field detected. Flush skipped.";
  }
  return null;
}
