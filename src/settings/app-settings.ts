import type { TranscriptMode } from "../dictation/dictation";
import { DEFAULT_DICTATION_HOTKEY } from "./hotkey";

export type ActivationMode = "tap" | "push";

export type PipeSettings = {
  enabled: boolean;
  host: string;
  port: number;
  user: string;
  remoteDns: boolean;
};

export type AppSettings = {
  micId: string;
  mode: TranscriptMode;
  activationMode: ActivationMode;
  dictationHotkey: string;
  pauseHotkey: string;
  launchAtLogin: boolean;
  chimesEnabled: boolean;
  firstRunComplete: boolean;
  pipe: PipeSettings;
};

export const defaultPipeSettings = (): PipeSettings => ({
  enabled: false,
  host: "",
  port: 1080,
  user: "",
  remoteDns: true,
});

export const defaultAppSettings = (): AppSettings => ({
  micId: "",
  mode: "smart",
  activationMode: "tap",
  dictationHotkey: DEFAULT_DICTATION_HOTKEY,
  pauseHotkey: "",
  launchAtLogin: false,
  chimesEnabled: false,
  firstRunComplete: false,
  pipe: defaultPipeSettings(),
});

function normalizeMode(mode: unknown): TranscriptMode {
  return mode === "verbatim" ? "verbatim" : "smart";
}

function normalizePipe(raw: unknown): PipeSettings {
  const base = defaultPipeSettings();
  if (!raw || typeof raw !== "object") return base;
  const record = raw as Record<string, unknown>;
  return {
    enabled: record.enabled === true,
    host: typeof record.host === "string" ? record.host : base.host,
    port:
      typeof record.port === "number" && Number.isFinite(record.port)
        ? record.port
        : base.port,
    user: typeof record.user === "string" ? record.user : base.user,
    remoteDns: record.remoteDns !== false,
  };
}

export function parseAppSettings(raw: unknown): AppSettings {
  const base = defaultAppSettings();
  if (!raw || typeof raw !== "object") return base;
  const record = raw as Record<string, unknown>;
  return {
    micId: typeof record.micId === "string" ? record.micId : base.micId,
    mode: normalizeMode(record.mode),
    activationMode: record.activationMode === "push" ? "push" : "tap",
    dictationHotkey:
      typeof record.dictationHotkey === "string" && record.dictationHotkey.trim()
        ? record.dictationHotkey.trim()
        : base.dictationHotkey,
    pauseHotkey:
      typeof record.pauseHotkey === "string" ? record.pauseHotkey.trim() : base.pauseHotkey,
    launchAtLogin: record.launchAtLogin === true,
    chimesEnabled: record.chimesEnabled === true,
    firstRunComplete: record.firstRunComplete === true,
    pipe: normalizePipe(record.pipe),
  };
}

export function createAppSettings(deps: {
  read(): unknown;
  write(settings: AppSettings): void;
}) {
  let current = parseAppSettings(deps.read());

  return {
    get(): AppSettings {
      return structuredClone(current);
    },
    save(partial: Partial<AppSettings>) {
      current = parseAppSettings({
        ...current,
        ...partial,
        pipe: partial.pipe ? { ...current.pipe, ...partial.pipe } : current.pipe,
      });
      deps.write(current);
    },
  };
}
