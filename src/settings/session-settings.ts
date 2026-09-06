export type { AppSettings } from "./app-settings";
export {
  defaultAppSettings as defaultSessionSettings,
  createAppSettings as createSessionSettings,
} from "./app-settings";

export type SessionSettings = {
  micId: string;
  mode: import("../dictation/dictation").TranscriptMode;
  chimesEnabled?: boolean;
};
