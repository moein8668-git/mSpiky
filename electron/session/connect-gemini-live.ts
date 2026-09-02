import {
  GoogleGenAI,
  Modality,
  type AudioTranscriptionConfig,
  type LiveServerMessage,
  type Session,
  type Transcription,
} from "@google/genai";
import type { LiveConnect } from "../../src/session/gemini-live-session";
import type { GeminiShapedEvent } from "../../src/dictation/map-gemini-event";
import { sessionTranscriptionConfig } from "../../src/session/session-transcription-config";

const DEFAULT_MODEL =
  process.env.GEMINI_TRANSCRIBE_MODEL || "gemini-3.5-transcribe-live";

type TranscriptionConfig = AudioTranscriptionConfig & {
  mode?: "smart" | "verbatim";
};

type ServerContent = NonNullable<LiveServerMessage["serverContent"]> & {
  interimInputTranscription?: Transcription;
};

function eventsFromMessage(message: LiveServerMessage): GeminiShapedEvent[] {
  const content = message.serverContent as ServerContent | undefined;
  if (!content) return [];

  const events: GeminiShapedEvent[] = [];
  const interim = content.interimInputTranscription?.text?.trim();
  if (interim) events.push({ type: "interim", text: interim });

  const transcript = content.inputTranscription;
  if (!transcript?.text?.trim()) return events;
  const text = transcript.text.trim();

  if (transcript.finished === false && !interim) {
    events.push({ type: "interim", text });
    return events;
  }

  if (transcript.finished !== false) {
    events.push({ finished: true, text });
  }
  return events;
}

export const connectGeminiLive: LiveConnect = async (options, callbacks) => {
  const ai = new GoogleGenAI({ apiKey: options.apiKey });
  const transcription: TranscriptionConfig = sessionTranscriptionConfig(options.mode);

  const tryConnect = (responseModalities: Modality[]) =>
    ai.live.connect({
      model: DEFAULT_MODEL,
      config: {
        responseModalities,
        inputAudioTranscription: transcription,
      },
      callbacks: {
        onmessage: (message) => {
          for (const event of eventsFromMessage(message)) {
            callbacks.onEvent(event);
          }
        },
        onerror: (event) => {
          callbacks.onError(event.message || "Live session error");
        },
        onclose: (event) => {
          callbacks.onClose(event.reason || "Session closed");
        },
      },
    });

  let session: Session;
  try {
    session = await tryConnect([Modality.TEXT]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/response modalities/i.test(message) && !/1007/.test(message)) {
      throw error;
    }
    session = await tryConnect([Modality.AUDIO]);
  }

  return {
    sendPcm(pcm) {
      session.sendRealtimeInput({
        audio: {
          data: Buffer.from(pcm).toString("base64"),
          mimeType: "audio/pcm;rate=16000",
        },
      });
    },
    sendEndOfAudio() {
      try {
        session.sendRealtimeInput({ audioStreamEnd: true });
      } catch {
        // Session may already be gone.
      }
    },
    close() {
      try {
        session.close();
      } catch {
        // Ignore duplicate close.
      }
    },
  };
};
