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
  audioEndedAfterMs?: number;
}): SessionAdapter {
  let listener: SessionListener | undefined;
  let transport: LiveTransport | null = null;
  let generation = 0;
  const queued: Uint8Array[] = [];
  let liveMode: TranscriptMode = "smart";
  let holdAfterAudioEnd = false;
  let audioEndedTimer: ReturnType<typeof setTimeout> | undefined;
  const audioEndedAfterMs = deps.audioEndedAfterMs ?? 800;

  function clearAudioEndedTimer() {
    if (audioEndedTimer) {
      clearTimeout(audioEndedTimer);
      audioEndedTimer = undefined;
    }
  }

  function signalAudioEnded() {
    clearAudioEndedTimer();
    const notify = () => listener?.onAudioEnded();
    if (audioEndedAfterMs <= 0) {
      queueMicrotask(notify);
      return;
    }
    audioEndedTimer = setTimeout(notify, audioEndedAfterMs);
  }

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
        { apiKey, mode: liveMode },
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
      clearAudioEndedTimer();
      liveMode = options?.mode === "verbatim" ? "verbatim" : "smart";

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
      signalAudioEnded();
    },
    resume() {
      if (!listener) return;
      holdAfterAudioEnd = false;
      clearAudioEndedTimer();
      if (transport) return;
      connectGeneration(generation, false);
    },
    stop() {
      generation += 1;
      queued.length = 0;
      clearAudioEndedTimer();
      transport?.close();
      transport = null;
      listener = undefined;
    },
  };
}
