import type { SessionStartOptions } from "../dictation/dictation";
import type { StudioHistoryEntry } from "../history/studio-history";
import type { SessionSettings } from "../settings/session-settings";
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
  getSettings(): Promise<SessionSettings>;
  saveSettings(settings: Partial<SessionSettings>): Promise<void>;
  listHistory(): Promise<StudioHistoryEntry[]>;
  clearHistory(): Promise<void>;
  onHistoryUpdated(listener: () => void): () => void;
};

declare global {
  interface Window {
    mspikyStudio?: MspikyStudioApi;
  }
}

export {};
