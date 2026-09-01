import type { SessionStartOptions } from "../dictation/dictation";
import type { StudioCaptionSnapshot } from "./studio-captions";

export type MspikyStudioApi = {
  hasKey(): Promise<boolean>;
  saveKey(value: string): Promise<void>;
  onKeyMissing(listener: (message: string) => void): () => void;
  startCaptions(options: SessionStartOptions): Promise<void>;
  stopCaptions(): Promise<void>;
  failCaptions(message: string): Promise<void>;
  sendPcm(pcm: Uint8Array): void;
  onCaptions(listener: (snapshot: StudioCaptionSnapshot) => void): () => void;
};

declare global {
  interface Window {
    mspikyStudio?: MspikyStudioApi;
  }
}

export {};
