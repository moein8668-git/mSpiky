import WebSocket from "ws";
import type { Agent } from "http";

type WsErrorEvent = { message?: string };
type WsCloseEvent = { reason?: string; code?: number };
type WsMessageEvent = { data: unknown };

export type LiveWebSocketCallbacks = {
  onopen: () => void;
  onerror: (event: WsErrorEvent) => void;
  onclose: (event: WsCloseEvent) => void;
  onmessage: (event: WsMessageEvent) => void;
};

export type LiveWebSocket = {
  connect(): void;
  send(message: string): void;
  close(): void;
};

export type LiveWebSocketFactory = {
  create(
    url: string,
    headers: Record<string, string>,
    callbacks: LiveWebSocketCallbacks,
  ): LiveWebSocket;
};

export function createProxyWebSocketFactory(agent: Agent): LiveWebSocketFactory {
  return {
    create(url, headers, callbacks) {
      let ws: WebSocket | undefined;
      return {
        connect() {
          ws = new WebSocket(url, { headers, agent });
          ws.onopen = () => callbacks.onopen();
          ws.onerror = (event) => callbacks.onerror(event as WsErrorEvent);
          ws.onclose = (event) => callbacks.onclose(event as WsCloseEvent);
          ws.onmessage = (event) => callbacks.onmessage(event as WsMessageEvent);
        },
        send(message) {
          if (!ws) throw new Error("WebSocket is not connected");
          ws.send(message);
        },
        close() {
          ws?.close();
        },
      };
    },
  };
}

export function installLiveWebSocketFactory(
  live: { webSocketFactory: LiveWebSocketFactory },
  agent: Agent,
) {
  live.webSocketFactory = createProxyWebSocketFactory(agent);
}
