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
  let liveMode: TranscriptMode = "smart";
  let liveLanguage: string | undefined;
  let holdAfterAudioEnd = false;

  function deliver(event: GeminiShapedEvent) {
    const mapped = mapGeminiEvent(event);
    if (!mapped || !listener) return;
    if (mapped.kind === "draft") listener.onDraft(mapped.text);
    else listener.onCommit(mapped.text);
  }

  function connectGeneration(current: number, notifyReconnect: boolean) {
    const apiKey = deps.getKey()?.trim() ?? "";
    if (!apiKey) {
      listener?.onError?.(KEY_MISSING_MESSAGE);
      return;
    }

    void deps
      .connect(
        { apiKey, mode: liveMode, language: liveLanguage },
        {
          onEvent: deliver,
          onError(message) {
            if (current !== generation) return;
            listener?.onError?.(mapSessionError(message));
          },
          onClose() {
            if (current !== generation) return;
            const hadTransport = transport !== null;
            transport = null;
            if (holdAfterAudioEnd) return;
            if (!hadTransport) return;
            connectGeneration(current, true);
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
        if (notifyReconnect) listener?.onReconnected?.();
        else listener?.onReady?.();
      })
      .catch((error) => {
        if (current !== generation) return;
        const message = error instanceof Error ? error.message : String(error);
        listener?.onError?.(mapSessionError(message));
      });
  }

  return {
    start(next, options?: SessionStartOptions) {
      listener = next;
      const current = (generation += 1);
      transport?.close();
      transport = null;
      queued.length = 0;
      holdAfterAudioEnd = false;
      liveMode = options?.mode === "verbatim" ? "verbatim" : "smart";
      liveLanguage = options?.language?.trim() || undefined;

      const apiKey = deps.getKey()?.trim() ?? "";
      if (!apiKey) {
        listener.onError?.(KEY_MISSING_MESSAGE);
        return;
      }

      connectGeneration(current, false);
    },
    sendPcm(pcm) {
      if (transport) transport.sendPcm(pcm);
      else queued.push(pcm);
    },
    sendEndOfAudio() {
      holdAfterAudioEnd = true;
      transport?.sendEndOfAudio();
    },
    resume() {
      if (!listener) return;
      holdAfterAudioEnd = false;
      if (transport) return;
      connectGeneration(generation, false);
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
