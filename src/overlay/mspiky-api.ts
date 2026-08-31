import type { OverlaySnapshot } from "../dictation/dictation";

export type MspikyOverlayApi = {
  onSnapshot(listener: (snapshot: OverlaySnapshot) => void): () => void;
  pause(): void;
  resume(): void;
};

declare global {
  interface Window {
    mspiky?: MspikyOverlayApi;
  }
}

export {};
