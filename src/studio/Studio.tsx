import { useEffect, useRef, useState } from "react";
import type { TranscriptMode } from "../dictation/dictation";
import { KEY_MISSING_MESSAGE } from "../secrets/messages";
import { NO_MIC_MESSAGE } from "../session/messages";
import { studioChrome } from "../shell/shell";
import { STUDIO_LANGUAGES } from "./languages";
import { listMics, startStudioMic, type MicDevice, type StudioMicHandle } from "./mic-capture";
import type { StudioCaptionSnapshot } from "./studio-captions";
import "./mspiky-studio-api";

const idleCaptions: StudioCaptionSnapshot = {
    status: "idle",
    draft: "",
    commits: [],
    error: null,
    mode: "smart",
    language: "",
  };

export function Studio() {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [draftKey, setDraftKey] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<TranscriptMode>("smart");
  const [language, setLanguage] = useState("");
  const [micId, setMicId] = useState("");
  const [mics, setMics] = useState<MicDevice[]>([]);
  const [captions, setCaptions] = useState<StudioCaptionSnapshot>(idleCaptions);
  const captureRef = useRef<StudioMicHandle | null>(null);
  const settingsReady = useRef(false);

  useEffect(() => {
    const api = window.mspikyStudio;
    if (!api) return;
    void api.hasKey().then(setHasKey);
    void api.getSettings().then((settings) => {
      setMode(settings.mode);
      setLanguage(settings.language);
      setMicId(settings.micId);
      settingsReady.current = true;
    });
    const stopMissing = api.onKeyMissing((message) => setNotice(message));
    const stopCaptions = api.onCaptions(setCaptions);
    return () => {
      stopMissing();
      stopCaptions();
    };
  }, []);

  useEffect(() => {
    if (!settingsReady.current) return;
    void window.mspikyStudio?.saveSettings({ mode, language, micId });
  }, [mode, language, micId]);

  useEffect(() => {
    void refreshMics();
  }, []);

  useEffect(() => {
    if (captions.status === "error" || captions.status === "idle") {
      void stopCapture();
    }
  }, [captions.status]);

  async function refreshMics() {
    try {
      const next = await listMics();
      setMics(next);
    } catch {
      setMics([]);
    }
  }

  async function stopCapture() {
    const capture = captureRef.current;
    captureRef.current = null;
    if (capture) await capture.stop();
  }

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

  async function startMic() {
    const api = window.mspikyStudio;
    if (!api) return;
    if (!hasKey) {
      setNotice(KEY_MISSING_MESSAGE);
      await api.failCaptions(KEY_MISSING_MESSAGE);
      return;
    }
    try {
      await api.startCaptions({ mode, language: language || undefined });
      const capture = await startStudioMic(micId || undefined, (chunk) => {
        api.sendPcm(chunk);
      });
      captureRef.current = capture;
      void refreshMics();
    } catch {
      await api.failCaptions(NO_MIC_MESSAGE);
    }
  }

  async function stopMic() {
    await stopCapture();
    await window.mspikyStudio?.stopCaptions();
  }

  const live = captions.status === "connecting" || captions.status === "listening";

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 px-8 py-10">
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
            className="w-full rounded border border-line bg-ink px-3 py-2 text-cream"
            value={draftKey}
            onChange={(event) => setDraftKey(event.target.value)}
          />
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded bg-cream px-3 py-1.5 text-sm font-medium text-ink disabled:opacity-50"
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

      <section className="space-y-3 rounded-lg border border-line p-4">
        <div className="space-y-1">
          <h2 className="text-sm font-medium text-cream">
            {studioChrome.captionsHeading}
          </h2>
          <p className="text-sm text-mute">{studioChrome.captionsBody}</p>
        </div>

        <label className="block space-y-1 text-sm text-mute">
          <span>{studioChrome.micLabel}</span>
          <select
            className="w-full rounded border border-line bg-ink px-3 py-2 text-cream"
            value={micId}
            disabled={live}
            onChange={(event) => setMicId(event.target.value)}
            onFocus={() => void refreshMics()}
          >
            <option value="">{studioChrome.micDefault}</option>
            {mics.map((mic) => (
              <option key={mic.deviceId} value={mic.deviceId}>
                {mic.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1 text-sm text-mute">
          <span>{studioChrome.modeLabel}</span>
          <select
            className="w-full rounded border border-line bg-ink px-3 py-2 text-cream"
            value={mode}
            disabled={live}
            onChange={(event) => setMode(event.target.value as TranscriptMode)}
          >
            <option value="smart">{studioChrome.modeSmart}</option>
            <option value="verbatim">{studioChrome.modeVerbatim}</option>
          </select>
        </label>

        <label className="block space-y-1 text-sm text-mute">
          <span>{studioChrome.languageLabel}</span>
          <select
            className="w-full rounded border border-line bg-ink px-3 py-2 text-cream"
            value={language}
            disabled={live}
            onChange={(event) => setLanguage(event.target.value)}
          >
            {STUDIO_LANGUAGES.map((item) => (
              <option key={item.value || "detect"} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-3">
          {live ? (
            <button
              type="button"
              className="rounded bg-cream px-3 py-1.5 text-sm font-medium text-ink"
              onClick={() => void stopMic()}
            >
              {studioChrome.micStop}
            </button>
          ) : (
            <button
              type="button"
              className="rounded bg-cream px-3 py-1.5 text-sm font-medium text-ink"
              onClick={() => void startMic()}
            >
              {studioChrome.micStart}
            </button>
          )}
          <span className="text-sm text-mute">
            {captions.status === "listening"
              ? studioChrome.statusListening
              : captions.status === "connecting"
                ? studioChrome.statusConnecting
                : captions.status === "error"
                  ? studioChrome.statusError
                  : studioChrome.statusReady}
          </span>
        </div>

        {captions.error ? (
          <p className="text-sm text-live" role="alert">
            {captions.error}
          </p>
        ) : null}

        <div
          className="min-h-24 rounded border border-line bg-ink px-3 py-2 text-sm text-cream"
          aria-live="polite"
        >
          {captions.commits.length || captions.draft ? (
            <>
              {captions.commits.join(" ")}
              {captions.draft ? (
                <span className="italic text-mute">
                  {captions.commits.length ? " " : ""}
                  {captions.draft}
                </span>
              ) : null}
            </>
          ) : (
            <span className="text-mute">{studioChrome.captionsPlaceholder}</span>
          )}
        </div>
      </section>
    </main>
  );
}
