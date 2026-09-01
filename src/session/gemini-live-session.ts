import type {
  SessionAdapter,
  SessionListener,
  SessionStartOptions,
  TranscriptMode,
} from "../dictation/dictation";
import {
  mapGeminiEvent,
  type GeminiShapedEvent,
} from "../dictation/map-gemini-event";
import { KEY_MISSING_MESSAGE } from "../secrets/messages";
import { mapSessionError } from "./messages";

export type LiveTransport = {
  sendPcm(pcm: Uint8Array): void;
  sendEndOfAudio(): void;
  close(): void;
};

export type LiveConnect = (
  options: {
    apiKey: string;
    mode: TranscriptMode;
    language?: string;
  },
  callbacks: {
    onEvent(event: GeminiShapedEvent): void;
    onError(message: string): void;
    onClose(reason: string): void;
  },
) => Promise<LiveTransport>;

export function createGeminiLiveSession(deps: {
  getKey(): string | null;
  connect: LiveConnect;
}): SessionAdapter {
  let listener: SessionListener | undefined;
  let transport: LiveTransport | null = null;
  let generation = 0;
  const queued: Uint8Array[] = [];

  function deliver(event: GeminiShapedEvent) {
    const mapped = mapGeminiEvent(event);
    if (!mapped || !listener) return;
    if (mapped.kind === "draft") listener.onDraft(mapped.text);
    else listener.onCommit(mapped.text);
  }

  return {
    start(next, options?: SessionStartOptions) {
      listener = next;
      const current = (generation += 1);
      transport?.close();
      transport = null;
      queued.length = 0;

      const apiKey = deps.getKey()?.trim() ?? "";
      if (!apiKey) {
        listener.onError?.(KEY_MISSING_MESSAGE);
        return;
      }

      const mode: TranscriptMode =
        options?.mode === "verbatim" ? "verbatim" : "smart";
      const language = options?.language?.trim() || undefined;

      void deps
        .connect(
          { apiKey, mode, language },
          {
            onEvent: deliver,
            onError(message) {
              if (current !== generation) return;
              listener?.onError?.(mapSessionError(message));
            },
            onClose() {
              if (current !== generation) return;
              transport = null;
            },
          },
        )
        .then((nextTransport) => {
          if (current !== generation) {
            nextTransport.close();
            return;
          }
          transport = nextTransport;
          for (const chunk of queued.splice(0)) {
            transport.sendPcm(chunk);
          }
          listener?.onReady?.();
        })
        .catch((error) => {
          if (current !== generation) return;
          const message = error instanceof Error ? error.message : String(error);
          listener?.onError?.(mapSessionError(message));
        });
    },
    sendPcm(pcm) {
      if (transport) transport.sendPcm(pcm);
      else queued.push(pcm);
    },
    sendEndOfAudio() {
      transport?.sendEndOfAudio();
    },
    stop() {
      generation += 1;
      queued.length = 0;
      transport?.close();
      transport = null;
      listener = undefined;
    },
  };
}
