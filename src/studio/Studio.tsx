import { useEffect, useState } from "react";
import { studioChrome } from "../shell/shell";
import "./mspiky-studio-api";

export function Studio() {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [draftKey, setDraftKey] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const api = window.mspikyStudio;
    if (!api) return;
    void api.hasKey().then(setHasKey);
    return api.onKeyMissing((message) => setNotice(message));
  }, []);

  async function saveKey() {
    const api = window.mspikyStudio;
    if (!api) return;
    setSaving(true);
    setSaveError(null);
    try {
      await api.saveKey(draftKey);
      setDraftKey("");
      setHasKey(true);
      setNotice(studioChrome.keySaved);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Could not save your Key.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 px-8 py-10">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {studioChrome.heading}
        </h1>
        <p className="text-mute">{studioChrome.body}</p>
      </div>

      <section className="space-y-3 rounded-lg border border-line p-4">
        <div className="space-y-1">
          <h2 className="text-sm font-medium text-cream">{studioChrome.keyHeading}</h2>
          <p className="text-sm text-mute">{studioChrome.keyBody}</p>
        </div>
        <label className="block space-y-1 text-sm text-mute">
          <span>{studioChrome.keyPlaceholder}</span>
          <input
            type="password"
            autoComplete="off"
            className="w-full rounded border border-line bg-bg px-3 py-2 text-cream"
            value={draftKey}
            onChange={(event) => setDraftKey(event.target.value)}
          />
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded bg-cream px-3 py-1.5 text-sm font-medium text-bg disabled:opacity-50"
            disabled={saving || draftKey.trim().length === 0}
            onClick={() => void saveKey()}
          >
            {studioChrome.keySave}
          </button>
          <span className="text-sm text-mute">
            {hasKey === null
              ? "…"
              : hasKey
                ? studioChrome.keySaved
                : studioChrome.keyMissing}
          </span>
        </div>
        {notice ? (
          <p className="text-sm text-live" role="alert">
            {notice}
          </p>
        ) : null}
        {saveError ? (
          <p className="text-sm text-live" role="alert">
            {saveError}
          </p>
        ) : null}
      </section>

      {studioChrome.overlayPauseNote ? (
        <p className="text-sm text-mute">{studioChrome.overlayPauseNote}</p>
      ) : null}
    </main>
  );
}
