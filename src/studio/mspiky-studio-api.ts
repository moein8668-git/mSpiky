export type MspikyStudioApi = {
  hasKey(): Promise<boolean>;
  saveKey(value: string): Promise<void>;
  onKeyMissing(listener: (message: string) => void): () => void;
};

declare global {
  interface Window {
    mspikyStudio?: MspikyStudioApi;
  }
}

export {};
