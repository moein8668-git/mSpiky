import type { AppSettings } from "../settings/app-settings";
import type { SessionStartOptions } from "../dictation/dictation";
import type { StudioHistoryEntry } from "../history/studio-history";
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
  getSettings(): Promise<AppSettings>;
  saveSettings(settings: Partial<AppSettings>): Promise<void>;
  listHistory(): Promise<StudioHistoryEntry[]>;
  clearHistory(): Promise<void>;
  onHistoryUpdated(listener: () => void): () => void;
  saveTranscript(text: string): Promise<boolean>;
  testPipe(): Promise<{ ok: boolean; message: string }>;
  savePipePassword(password: string): Promise<void>;
  getPlatform(): Promise<string>;
  openAccessibilitySettings(): Promise<void>;
  completeFirstRun(): Promise<void>;
  pushToTalkAvailable(): Promise<boolean>;
};

declare global {
  interface Window {
    mspikyStudio?: MspikyStudioApi;
  }
}

export {};
