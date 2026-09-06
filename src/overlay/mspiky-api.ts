import type { ChimeKind } from "../audio/chime";
import type { OverlaySnapshot } from "../dictation/dictation";
import type { AppSettings } from "../settings/app-settings";

export type MspikyOverlayApi = {
  onSnapshot(listener: (snapshot: OverlaySnapshot) => void): () => void;
  onChime(listener: (kind: ChimeKind) => void): () => void;
  sendPcm(pcm: Uint8Array): void;
  failMic(): void;
  captureSettings(): Promise<Pick<AppSettings, "micId" | "mode" | "chimesEnabled">>;
};

declare global {
  interface Window {
    mspiky?: MspikyOverlayApi;
  }
}

export {};
