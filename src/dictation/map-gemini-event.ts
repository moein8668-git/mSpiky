export type GeminiShapedEvent = {
  type?: string;
  finished?: boolean;
  text?: string;
};

export type MappedTranscript = {
  kind: "draft" | "commit";
  text: string;
};

export function mapGeminiEvent(
  event: GeminiShapedEvent,
): MappedTranscript | null {
  const text = event.text ?? "";
  if (!text) return null;
  if (event.type === "interim" || event.finished === false) {
    return { kind: "draft", text };
  }
  return { kind: "commit", text };
}
