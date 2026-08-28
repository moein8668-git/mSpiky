export type TranscriptMode = "smart" | "verbatim";

export type ServerEvent =
  | { type: "ready"; model?: string }
  | { type: "interim"; text: string }
  | { type: "final"; text: string }
  | { type: "error"; message: string }
  | { type: "closed"; reason?: string };

export class TranscribeClient {
  private socket: WebSocket | null = null;

  connect(handlers: {
    onEvent: (event: ServerEvent) => void;
    onOpen?: () => void;
  }): Promise<void> {
    this.disconnect();
    const protocol = location.protocol === "https:" ? "wss" : "ws";
    const socket = new WebSocket(`${protocol}://${location.host}/ws`);
    socket.binaryType = "arraybuffer";
    this.socket = socket;

    socket.addEventListener("message", (event) => {
      if (typeof event.data !== "string") return;
      try {
        handlers.onEvent(JSON.parse(event.data) as ServerEvent);
      } catch {
        handlers.onEvent({ type: "error", message: "Bad server message" });
      }
    });

    socket.addEventListener("error", () => {
      handlers.onEvent({
        type: "error",
        message: "Could not reach the transcribe server.",
      });
    });

    socket.addEventListener("close", () => {
      if (this.socket === socket) this.socket = null;
      handlers.onEvent({ type: "closed", reason: "socket" });
    });

    return new Promise((resolve, reject) => {
      socket.addEventListener("open", () => {
        handlers.onOpen?.();
        resolve();
      });
      socket.addEventListener("error", () => reject(new Error("WebSocket failed")), {
        once: true,
      });
    });
  }

  start(options: {
    mode: TranscriptMode;
    language?: string;
    apiKey?: string;
  }) {
    this.sendJson({
      type: "start",
      mode: options.mode,
      language: options.language,
      apiKey: options.apiKey,
    });
  }

  sendPcm(chunk: ArrayBuffer) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(chunk);
    }
  }

  endAudio() {
    this.sendJson({ type: "audio_end" });
  }

  stop() {
    this.sendJson({ type: "stop" });
  }

  disconnect() {
    if (!this.socket) return;
    const socket = this.socket;
    this.socket = null;
    if (socket.readyState === WebSocket.OPEN) {
      socket.close();
    }
  }

  private sendJson(payload: unknown) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
    }
  }
}
