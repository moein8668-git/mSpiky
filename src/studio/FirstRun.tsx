import { useState } from "react";
import { studioChrome } from "../shell/shell";

type FirstRunProps = {
  hasKey: boolean;
  onSaveKey: (value: string) => Promise<void>;
  onRequestMic: () => Promise<void>;
  onOpenAccessibility: () => void;
  onComplete: () => void;
  platform: string;
};

export function FirstRun({
  hasKey,
  onSaveKey,
  onRequestMic,
  onOpenAccessibility,
  onComplete,
  platform,
}: FirstRunProps) {
  const [draftKey, setDraftKey] = useState("");
  const [micDone, setMicDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function tryMic() {
    setError(null);
    try {
      await onRequestMic();
      setMicDone(true);
    } catch {
      setError("Microphone permission is required for Dictation.");
    }
  }

  async function saveKey() {
    setSaving(true);
    setError(null);
    try {
      await onSaveKey(draftKey);
      setDraftKey("");
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Could not save your Key.",
      );
    } finally {
      setSaving(false);
    }
  }

  const ready = hasKey && micDone;

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 px-8 py-10">
      <div className="flex items-center gap-3">
        <img
          src="/mspiky.png"
          alt=""
          width={48}
          height={48}
          className="h-12 w-12 rounded-xl"
        />
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {studioChrome.firstRunHeading}
          </h1>
          <p className="text-mute">{studioChrome.firstRunBody}</p>
        </div>
      </div>

      <section className="space-y-3 rounded-lg border border-line p-4">
        <h2 className="text-sm font-medium text-cream">
          {studioChrome.firstRunKeyStep}
        </h2>
        <input
          type="password"
          autoComplete="off"
          className="w-full rounded border border-line bg-ink px-3 py-2 text-cream"
          placeholder={studioChrome.keyPlaceholder}
          value={draftKey}
          onChange={(event) => setDraftKey(event.target.value)}
        />
        <button
          type="button"
          className="rounded bg-cream px-3 py-1.5 text-sm font-medium text-ink disabled:opacity-50"
          disabled={saving || draftKey.trim().length === 0}
          onClick={() => void saveKey()}
        >
          {studioChrome.keySave}
        </button>
        <p className="text-sm text-mute">
          {hasKey ? studioChrome.keySaved : studioChrome.keyMissing}
        </p>
      </section>

      <section className="space-y-3 rounded-lg border border-line p-4">
        <h2 className="text-sm font-medium text-cream">
          {studioChrome.firstRunMicStep}
        </h2>
        <button
          type="button"
          className="rounded bg-cream px-3 py-1.5 text-sm font-medium text-ink"
          onClick={() => void tryMic()}
        >
          {studioChrome.micStart}
        </button>
        {micDone ? (
          <p className="text-sm text-mute">Microphone ready.</p>
        ) : null}
      </section>

      {platform === "darwin" ? (
        <section className="space-y-3 rounded-lg border border-line p-4">
          <h2 className="text-sm font-medium text-cream">
            {studioChrome.firstRunAccessibilityStep}
          </h2>
          <button
            type="button"
            className="rounded border border-line px-3 py-1.5 text-sm text-cream"
            onClick={onOpenAccessibility}
          >
            {studioChrome.firstRunOpenAccessibility}
          </button>
        </section>
      ) : null}

      <section className="space-y-3 rounded-lg border border-line p-4">
        <h2 className="text-sm font-medium text-cream">
          {studioChrome.firstRunPipeStep}
        </h2>
        <p className="text-sm text-mute">{studioChrome.pipeBody}</p>
        <p className="text-sm text-mute">{studioChrome.firstRunSkipPipe}</p>
      </section>

      {error ? (
        <p className="text-sm text-live" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        className="rounded bg-cream px-3 py-2 text-sm font-medium text-ink disabled:opacity-50"
        disabled={!ready}
        onClick={onComplete}
      >
        {studioChrome.firstRunFinish}
      </button>
    </main>
  );
}
