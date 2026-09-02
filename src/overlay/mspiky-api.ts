import type { OverlaySnapshot } from "../dictation/dictation";
import type { SessionSettings } from "../settings/session-settings";

export type MspikyOverlayApi = {
  onSnapshot(listener: (snapshot: OverlaySnapshot) => void): () => void;
  sendPcm(pcm: Uint8Array): void;
  failMic(): void;
  captureSettings(): Promise<SessionSettings>;
};

declare global {
  interface Window {
    mspiky?: MspikyOverlayApi;
  }
}

export {};
