export const INVALID_KEY_MESSAGE =
  "Your Key is invalid. Check Studio Settings.";
export const NO_MIC_MESSAGE = "No microphone found.";

export function mapSessionError(message: string): string {
  if (/api key|invalid key|permission denied|401|403/i.test(message)) {
    return INVALID_KEY_MESSAGE;
  }
  return message;
}
