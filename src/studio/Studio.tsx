import { useEffect, useRef, useState } from "react";
import type { TranscriptMode } from "../dictation/dictation";
import type { AppSettings } from "../settings/app-settings";
import { validateHotkey, validatePushHotkey } from "../settings/hotkey";
import type { StudioHistoryEntry } from "../history/studio-history";
import { KEY_MISSING_MESSAGE } from "../secrets/messages";
import { NO_MIC_MESSAGE } from "../session/messages";
import { studioChrome } from "../shell/shell";
import { startStudioFile, type StudioFileHandle } from "./file-capture";
import { listMics, startStudioMic, type MicDevice, type StudioMicHandle } from "./mic-capture";
import type { StudioCaptionSnapshot } from "./studio-captions";
import { studioCaptionText } from "./studio-caption-text";
import "./mspiky-studio-api";

const idleCaptions: StudioCaptionSnapshot = {
  status: "idle",
  draft: "",
  commits: [],
  error: null,
  mode: "smart",
};

function formatHistoryWhen(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return createdAt;
  return date.toLocaleString();
}

export function Studio() {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [draftKey, setDraftKey] = useState("");
  const [keyEditing, setKeyEditing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<TranscriptMode>("smart");
  const [micId, setMicId] = useState("");
  const [activationMode, setActivationMode] =
    useState<AppSettings["activationMode"]>("tap");
  const [dictationHotkey, setDictationHotkey] = useState("Control+Shift+Space");
  const [pushToTalkHotkey, setPushToTalkHotkey] = useState("F8");
  const [launchAtLogin, setLaunchAtLogin] = useState(false);
  const [chimesEnabled, setChimesEnabled] = useState(false);
  const [pipeEnabled, setPipeEnabled] = useState(false);
  const [pipeHost, setPipeHost] = useState("");
  const [pipePort, setPipePort] = useState(1080);
  const [pipeUser, setPipeUser] = useState("");
  const [pipePassword, setPipePassword] = useState("");
  const [pipeRemoteDns, setPipeRemoteDns] = useState(true);
  const [pipeNotice, setPipeNotice] = useState<string | null>(null);
  const [pushAvailable, setPushAvailable] = useState(true);
  const [mics, setMics] = useState<MicDevice[]>([]);
  const [captions, setCaptions] = useState<StudioCaptionSnapshot>(idleCaptions);
  const [history, setHistory] = useState<StudioHistoryEntry[]>([]);
  const [source, setSource] = useState<"mic" | "file" | null>(null);
  const captureRef = useRef<StudioMicHandle | null>(null);
  const fileRef = useRef<StudioFileHandle | null>(null);
  const settingsReady = useRef(false);

  async function loadHistory() {
    const entries = await window.mspikyStudio?.listHistory();
    setHistory(entries ?? []);
  }

  useEffect(() => {
    const api = window.mspikyStudio;
    if (!api) return;
    void api.hasKey().then(setHasKey);
    void api.pushToTalkAvailable().then(setPushAvailable);
    void api.getSettings().then((settings) => {
      setMode(settings.mode);
      setMicId(settings.micId);
      setActivationMode(settings.activationMode);
      setDictationHotkey(settings.dictationHotkey);
      setPushToTalkHotkey(settings.pushToTalkHotkey);
      setLaunchAtLogin(settings.launchAtLogin);
      setChimesEnabled(settings.chimesEnabled);
      setPipeEnabled(settings.pipe.enabled);
      setPipeHost(settings.pipe.host);
      setPipePort(settings.pipe.port);
      setPipeUser(settings.pipe.user);
      setPipeRemoteDns(settings.pipe.remoteDns);
      settingsReady.current = true;
    });
    void loadHistory();
    const stopHistory = api.onHistoryUpdated(() => {
      void loadHistory();
    });
    const stopMissing = api.onKeyMissing((message) => setNotice(message));
    const stopCaptions = api.onCaptions(setCaptions);
    return () => {
      stopHistory();
      stopMissing();
      stopCaptions();
    };
  }, []);

  useEffect(() => {
    if (!settingsReady.current) return;
    void window.mspikyStudio?.saveSettings({
      mode,
      micId,
      activationMode,
      dictationHotkey,
      pushToTalkHotkey,
      launchAtLogin,
      chimesEnabled,
      pipe: {
        enabled: pipeEnabled,
        host: pipeHost,
        port: pipePort,
        user: pipeUser,
        remoteDns: pipeRemoteDns,
      },
    });
  }, [
    mode,
    micId,
    activationMode,
    dictationHotkey,
    pushToTalkHotkey,
    launchAtLogin,
    chimesEnabled,
    pipeEnabled,
    pipeHost,
    pipePort,
    pipeUser,
    pipeRemoteDns,
  ]);

  useEffect(() => {
    if (!settingsReady.current || !pipePassword.trim()) return;
    void window.mspikyStudio?.savePipePassword(pipePassword).then(() => {
      setPipePassword("");
    });
  }, [pipePassword]);

  useEffect(() => {
    void refreshMics();
  }, []);

  useEffect(() => {
    if (captions.status === "error" || captions.status === "idle") {
      void stopCapture();
      setSource(null);
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
    const file = fileRef.current;
    fileRef.current = null;
    if (file) await file.stop();
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
      setKeyEditing(false);
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
      await api.startCaptions({ mode });
      const capture = await startStudioMic(micId || undefined, (chunk) => {
        api.sendPcm(chunk);
      });
      captureRef.current = capture;
      setSource("mic");
      void refreshMics();
    } catch {
      await api.failCaptions(NO_MIC_MESSAGE);
    }
  }

  async function startFile(file: File) {
    const api = window.mspikyStudio;
    if (!api) return;
    if (!hasKey) {
      setNotice(KEY_MISSING_MESSAGE);
      await api.failCaptions(KEY_MISSING_MESSAGE);
      return;
    }
    await stopCapture();
    try {
      await api.startCaptions({ mode });
      const capture = await startStudioFile(
        file,
        (chunk) => api.sendPcm(chunk),
        () => {
          void stopFile();
        },
      );
      fileRef.current = capture;
      setSource("file");
    } catch {
      await api.failCaptions("Could not play that file.");
    }
  }

  async function stopFile() {
    await stopCapture();
    await window.mspikyStudio?.stopCaptions();
    await loadHistory();
  }

  async function stopMic() {
    await stopCapture();
    await window.mspikyStudio?.stopCaptions();
    await loadHistory();
  }

  async function clearHistory() {
    await window.mspikyStudio?.clearHistory();
    setHistory([]);
  }

  async function copyHistory(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard may be unavailable in some environments.
    }
  }

  async function copyCaptions() {
    const text = studioCaptionText(captions);
    if (!text) return;
    await copyHistory(text);
  }

  async function saveCaptions() {
    const text = studioCaptionText(captions);
    if (!text) return;
    await window.mspikyStudio?.saveTranscript(text);
  }

  async function testPipe() {
    const result = await window.mspikyStudio?.testPipe();
    setPipeNotice(
      result?.ok ? studioChrome.pipeTestOk : result?.message ?? studioChrome.pipeTestFail,
    );
  }

  const live = captions.status === "connecting" || captions.status === "listening";
  const keyMasked = hasKey && !keyEditing && !draftKey;
  const dictationHotkeyError = validateHotkey(dictationHotkey);
  const pushToTalkHotkeyError = validatePushHotkey(pushToTalkHotkey);
  const hotkeysClash =
    activationMode === "push" &&
    dictationHotkeyError.ok &&
    pushToTalkHotkeyError.ok &&
    dictationHotkey.trim().toLowerCase() === pushToTalkHotkey.trim().toLowerCase();

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 px-8 py-10">
      <div className="flex items-center gap-3">
        <img
          src="/mspiky.png"
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 rounded-lg"
        />
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {studioChrome.heading}
          </h1>
          <p className="text-mute">{studioChrome.body}</p>
        </div>
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
            value={keyMasked ? "************************" : draftKey}
            onFocus={() => {
              if (hasKey && !keyEditing) {
                setKeyEditing(true);
                setDraftKey("");
              }
            }}
            onChange={(event) => {
              setKeyEditing(true);
              setDraftKey(event.target.value);
            }}
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
            {studioChrome.settingsHeading}
          </h2>
          <p className="text-sm text-mute">{studioChrome.settingsBody}</p>
        </div>
        <label className="block space-y-1 text-sm text-mute">
          <span>{studioChrome.activationLabel}</span>
          <select
            className="w-full rounded border border-line bg-ink px-3 py-2 text-cream"
            value={activationMode}
            onChange={(event) =>
              setActivationMode(event.target.value as AppSettings["activationMode"])
            }
          >
            <option value="tap">{studioChrome.activationTap}</option>
            <option value="push" disabled={!pushAvailable}>
              {studioChrome.activationPush}
            </option>
          </select>
        </label>
        {!pushAvailable ? (
          <p className="text-sm text-mute">{studioChrome.pushToTalkUnavailable}</p>
        ) : null}
        <label className="block space-y-1 text-sm text-mute">
          <span>{studioChrome.dictationHotkeyLabel}</span>
          <input
            className="w-full rounded border border-line bg-ink px-3 py-2 text-cream"
            value={dictationHotkey}
            onChange={(event) => setDictationHotkey(event.target.value)}
          />
        </label>
        {!dictationHotkeyError.ok ? (
          <p className="text-sm text-live">{dictationHotkeyError.reason}</p>
        ) : null}
        {activationMode === "push" ? (
          <label className="block space-y-1 text-sm text-mute">
            <span>{studioChrome.pushToTalkHotkeyLabel}</span>
            <input
              className="w-full rounded border border-line bg-ink px-3 py-2 text-cream"
              value={pushToTalkHotkey}
              onChange={(event) => setPushToTalkHotkey(event.target.value)}
            />
          </label>
        ) : null}
        {activationMode === "push" && !pushToTalkHotkeyError.ok ? (
          <p className="text-sm text-live">{pushToTalkHotkeyError.reason}</p>
        ) : null}
        {hotkeysClash ? (
          <p className="text-sm text-live">
            Use a different key for push-to-talk than start / stop.
          </p>
        ) : null}
        <label className="flex items-center gap-2 text-sm text-cream">
          <input
            type="checkbox"
            checked={launchAtLogin}
            onChange={(event) => setLaunchAtLogin(event.target.checked)}
          />
          {studioChrome.launchAtLoginLabel}
        </label>
        <label className="flex items-center gap-2 text-sm text-cream">
          <input
            type="checkbox"
            checked={chimesEnabled}
            onChange={(event) => setChimesEnabled(event.target.checked)}
          />
          {studioChrome.chimesLabel}
        </label>
        <p className="text-sm text-mute">{studioChrome.chimesHint}</p>
      </section>

      <section className="space-y-3 rounded-lg border border-line p-4">
        <div className="space-y-1">
          <h2 className="text-sm font-medium text-cream">{studioChrome.pipeHeading}</h2>
          <p className="text-sm text-mute">{studioChrome.pipeBody}</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-cream">
          <input
            type="checkbox"
            checked={pipeEnabled}
            onChange={(event) => setPipeEnabled(event.target.checked)}
          />
          {studioChrome.pipeEnabled}
        </label>
        <label className="block space-y-1 text-sm text-mute">
          <span>{studioChrome.pipeHost}</span>
          <input
            className="w-full rounded border border-line bg-ink px-3 py-2 text-cream"
            value={pipeHost}
            onChange={(event) => setPipeHost(event.target.value)}
          />
        </label>
        <label className="block space-y-1 text-sm text-mute">
          <span>{studioChrome.pipePort}</span>
          <input
            type="number"
            className="w-full rounded border border-line bg-ink px-3 py-2 text-cream"
            value={pipePort}
            onChange={(event) => setPipePort(Number(event.target.value))}
          />
        </label>
        <label className="block space-y-1 text-sm text-mute">
          <span>{studioChrome.pipeUser}</span>
          <input
            className="w-full rounded border border-line bg-ink px-3 py-2 text-cream"
            value={pipeUser}
            onChange={(event) => setPipeUser(event.target.value)}
          />
        </label>
        <label className="block space-y-1 text-sm text-mute">
          <span>{studioChrome.pipePassword}</span>
          <input
            type="password"
            className="w-full rounded border border-line bg-ink px-3 py-2 text-cream"
            value={pipePassword}
            onChange={(event) => setPipePassword(event.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-cream">
          <input
            type="checkbox"
            checked={pipeRemoteDns}
            onChange={(event) => setPipeRemoteDns(event.target.checked)}
          />
          {studioChrome.pipeRemoteDns}
        </label>
        <button
          type="button"
          className="rounded border border-line px-3 py-1.5 text-sm text-cream"
          onClick={() => void testPipe()}
        >
          {studioChrome.pipeTest}
        </button>
        {pipeNotice ? <p className="text-sm text-mute">{pipeNotice}</p> : null}
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

        <div className="flex flex-wrap items-center gap-3">
          {live && source === "mic" ? (
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
              className="rounded bg-cream px-3 py-1.5 text-sm font-medium text-ink disabled:opacity-50"
              disabled={live}
              onClick={() => void startMic()}
            >
              {studioChrome.micStart}
            </button>
          )}
          <label className="rounded border border-line px-3 py-1.5 text-sm text-cream">
            {studioChrome.filePick}
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              disabled={live}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void startFile(file);
                event.currentTarget.value = "";
              }}
            />
          </label>
          {live && source === "file" ? (
            <button
              type="button"
              className="rounded bg-cream px-3 py-1.5 text-sm font-medium text-ink"
              onClick={() => void stopFile()}
            >
              {studioChrome.fileStop}
            </button>
          ) : null}
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
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded border border-line px-2 py-1 text-xs text-cream disabled:opacity-50"
            disabled={!studioCaptionText(captions)}
            onClick={() => void copyCaptions()}
          >
            {studioChrome.fileCopy}
          </button>
          <button
            type="button"
            className="rounded border border-line px-2 py-1 text-xs text-cream disabled:opacity-50"
            disabled={!studioCaptionText(captions)}
            onClick={() => void saveCaptions()}
          >
            {studioChrome.fileSave}
          </button>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-line p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-sm font-medium text-cream">
              {studioChrome.historyHeading}
            </h2>
            <p className="text-sm text-mute">{studioChrome.historyBody}</p>
          </div>
          {history.length > 0 ? (
            <button
              type="button"
              className="shrink-0 rounded border border-line px-2 py-1 text-xs text-cream"
              onClick={() => void clearHistory()}
            >
              {studioChrome.historyClear}
            </button>
          ) : null}
        </div>

        {history.length === 0 ? (
          <p className="text-sm text-mute">{studioChrome.historyEmpty}</p>
        ) : (
          <ul className="space-y-3">
            {history.map((entry) => (
              <li
                key={entry.id}
                className="rounded border border-line bg-ink px-3 py-2 text-sm text-cream"
              >
                <div className="mb-2 flex items-center justify-between gap-3 text-xs text-mute">
                  <span>{formatHistoryWhen(entry.createdAt)}</span>
                  <span className="uppercase">
                    {entry.source === "overlay"
                      ? studioChrome.historySourceOverlay
                      : studioChrome.historySourceStudio}{" "}
                    · {entry.mode}
                  </span>
                </div>
                <p className="whitespace-pre-wrap">{entry.text}</p>
                <button
                  type="button"
                  className="mt-2 rounded border border-line px-2 py-1 text-xs text-cream"
                  onClick={() => void copyHistory(entry.text)}
                >
                  {studioChrome.historyCopy}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
