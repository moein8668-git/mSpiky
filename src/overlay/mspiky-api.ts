import type { OverlaySnapshot } from "../dictation/dictation";
import type { SessionSettings } from "../settings/session-settings";

export type MspikyOverlayApi = {
  onSnapshot(listener: (snapshot: OverlaySnapshot) => void): () => void;
  sendPcm(pcm: Uint8Array): void;
  failMic(): void;
  captureSettings(): Promise<SessionSettings>;
  setClickThrough(pass: boolean): void;
  startOverlayDrag(screenX: number, screenY: number): void;
  moveOverlayDrag(screenX: number, screenY: number): void;
  endOverlayDrag(): void;
};

declare global {
  interface Window {
    mspiky?: MspikyOverlayApi;
  }
}

export {};
