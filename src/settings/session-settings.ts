import type { TranscriptMode } from "../dictation/dictation";

export type SessionSettings = {
  micId: string;
  mode: TranscriptMode;
  language: string;
};

export const defaultSessionSettings = (): SessionSettings => ({
  micId: "",
  mode: "smart",
  language: "",
});

export function createSessionSettings(deps: {
  read(): SessionSettings | null;
  write(settings: SessionSettings): void;
}) {
  let current = { ...defaultSessionSettings(), ...deps.read() };
  if (current.mode !== "verbatim") current.mode = "smart";

  return {
    get(): SessionSettings {
      return { ...current };
    },
    save(partial: Partial<SessionSettings>) {
      current = {
        micId: partial.micId ?? current.micId,
        language: partial.language ?? current.language,
        mode:
          partial.mode === "verbatim"
            ? "verbatim"
            : partial.mode === "smart"
              ? "smart"
              : current.mode,
      };
      deps.write(current);
    },
  };
}
