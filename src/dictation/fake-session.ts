import type { SessionAdapter, SessionListener } from "./dictation";
import {
  mapGeminiEvent,
  type GeminiShapedEvent,
} from "./map-gemini-event";

export function createFakeSession() {
  let listener: SessionListener | undefined;

  const session: SessionAdapter = {
    start(next) {
      listener = next;
    },
    sendPcm() {},
    sendEndOfAudio() {
      listener?.onAudioEnded();
    },
    stop() {},
  };

  return {
    session,
    emitGemini(event: GeminiShapedEvent) {
      const mapped = mapGeminiEvent(event);
      if (!mapped || !listener) return;
      if (mapped.kind === "draft") listener.onDraft(mapped.text);
      else listener.onCommit(mapped.text);
    },
  };
}
