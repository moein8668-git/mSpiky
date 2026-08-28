import "dotenv/config";
import http from "node:http";
import express from "express";
import { WebSocketServer, type WebSocket } from "ws";
import {
  GoogleGenAI,
  Modality,
  type AudioTranscriptionConfig,
  type LiveServerMessage,
  type Session,
  type Transcription,
} from "@google/genai";

const PORT = Number(process.env.PORT || 8787);
const DEFAULT_MODEL =
  process.env.GEMINI_TRANSCRIBE_MODEL || "gemini-3.5-transcribe-live";

type ClientMessage =
  | {
      type: "start";
      mode?: "smart" | "verbatim";
      language?: string;
      apiKey?: string;
    }
  | { type: "audio_end" }
  | { type: "stop" };

type TranscriptionConfig = AudioTranscriptionConfig & {
  mode?: "smart" | "verbatim";
};

type ServerContent = NonNullable<LiveServerMessage["serverContent"]> & {
  interimInputTranscription?: Transcription;
};

function send(socket: WebSocket, payload: unknown) {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function publishTranscripts(socket: WebSocket, message: LiveServerMessage) {
  const content = message.serverContent as ServerContent | undefined;
  if (!content) return;

  const interim = content.interimInputTranscription?.text?.trim();
  if (interim) send(socket, { type: "interim", text: interim });

  const transcript = content.inputTranscription;
  if (!transcript?.text?.trim()) return;
  const text = transcript.text.trim();

  if (transcript.finished === false && !interim) {
    send(socket, { type: "interim", text });
    return;
  }

  if (transcript.finished !== false) {
    send(socket, { type: "final", text });
  }
}

async function connectSession(options: {
  apiKey: string;
  mode: "smart" | "verbatim";
  language?: string;
  onMessage: (message: LiveServerMessage) => void;
  onError: (error: Error) => void;
  onClose: (reason: string) => void;
}): Promise<Session> {
  const ai = new GoogleGenAI({ apiKey: options.apiKey });
  const transcription: TranscriptionConfig = { mode: options.mode };
  if (options.language) transcription.languageCodes = [options.language];

  const tryConnect = (responseModalities: Modality[]) =>
    ai.live.connect({
      model: DEFAULT_MODEL,
      config: {
        responseModalities,
        inputAudioTranscription: transcription,
      },
      callbacks: {
        onmessage: (message) => options.onMessage(message),
        onerror: (event) => {
          options.onError(new Error(event.message || "Live session error"));
        },
        onclose: (event) => {
          options.onClose(event.reason || "Session closed");
        },
      },
    });

  try {
    return await tryConnect([Modality.TEXT]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/response modalities/i.test(message) && !/1007/.test(message)) {
      throw error;
    }
    return await tryConnect([Modality.AUDIO]);
  }
}

const app = express();
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    hasKey: Boolean(process.env.GEMINI_API_KEY),
    model: DEFAULT_MODEL,
  });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (socket) => {
  let session: Session | null = null;
  let closing = false;

  const closeSession = async () => {
    if (closing) return;
    closing = true;
    const current = session;
    session = null;
    if (current) {
      try {
        current.sendRealtimeInput({ audioStreamEnd: true });
      } catch {
        // Session may already be gone.
      }
      try {
        current.close();
      } catch {
        // Ignore duplicate close.
      }
    }
    closing = false;
  };

  socket.on("message", async (raw, isBinary) => {
    try {
      if (isBinary) {
        if (!session) return;
        const data = Buffer.isBuffer(raw)
          ? raw
          : Buffer.from(raw as ArrayBuffer);
        session.sendRealtimeInput({
          audio: {
            data: data.toString("base64"),
            mimeType: "audio/pcm;rate=16000",
          },
        });
        return;
      }

      const msg = JSON.parse(String(raw)) as ClientMessage;
      if (msg.type === "start") {
        await closeSession();
        const apiKey = msg.apiKey?.trim() || process.env.GEMINI_API_KEY || "";
        if (!apiKey) {
          send(socket, {
            type: "error",
            message:
              "Missing Gemini API key. Add GEMINI_API_KEY to .env or paste it in the app.",
          });
          return;
        }

        session = await connectSession({
          apiKey,
          mode: msg.mode === "verbatim" ? "verbatim" : "smart",
          language: msg.language || undefined,
          onMessage: (message) => publishTranscripts(socket, message),
          onError: (error) => send(socket, { type: "error", message: error.message }),
          onClose: (reason) => {
            session = null;
            send(socket, { type: "closed", reason });
          },
        });
        send(socket, { type: "ready", model: DEFAULT_MODEL });
        return;
      }

      if (msg.type === "audio_end") {
        session?.sendRealtimeInput({ audioStreamEnd: true });
        return;
      }

      if (msg.type === "stop") {
        await closeSession();
        send(socket, { type: "closed", reason: "stopped" });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      send(socket, { type: "error", message });
    }
  });

  socket.on("close", () => {
    void closeSession();
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Live transcribe server on http://127.0.0.1:${PORT}`);
});
