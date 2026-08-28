import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Copy,
  DownloadSimple,
  Microphone,
  Pause,
  Play,
  Square,
  Trash,
  UploadSimple,
  Waveform,
} from "@phosphor-icons/react";
import { startFileCapture, startMicCapture, type CaptureHandle } from "./lib/audio";
import { TranscribeClient, type TranscriptMode } from "./lib/transcribe-client";

type Health = { ok: boolean; hasKey: boolean; model: string };
type Status = "idle" | "connecting" | "live" | "error";
type Source = "mic" | "file" | null;

const LANGUAGES = [
  { value: "", label: "Detect language" },
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "fa-IR", label: "Persian" },
  { value: "es-US", label: "Spanish" },
  { value: "fr-FR", label: "French" },
  { value: "de-DE", label: "German" },
  { value: "it-IT", label: "Italian" },
  { value: "pt-BR", label: "Portuguese" },
  { value: "tr-TR", label: "Turkish" },
  { value: "ar-EG", label: "Arabic" },
  { value: "hi-IN", label: "Hindi" },
  { value: "ja-JP", label: "Japanese" },
  { value: "ko-KR", label: "Korean" },
  { value: "cmn-Hans-CN", label: "Chinese" },
  { value: "ru-RU", label: "Russian" },
];

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function App() {
  const clientRef = useRef(new TranscribeClient());
  const captureRef = useRef<(CaptureHandle & { audio?: HTMLAudioElement }) | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const readyWaiter = useRef<((ok: boolean) => void) | null>(null);
  const ignoreClose = useRef(false);

  const [health, setHealth] = useState<Health | null>(null);
  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem("live-transcribe.apiKey") || "",
  );
  const [mode, setMode] = useState<TranscriptMode>("smart");
  const [language, setLanguage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [source, setSource] = useState<Source>(null);
  const [error, setError] = useState("");
  const [finals, setFinals] = useState<string[]>([]);
  const [interim, setInterim] = useState("");
  const [fileName, setFileName] = useState("");
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState({ current: 0, duration: 0 });
  const [copied, setCopied] = useState(false);

  const transcript = useMemo(() => {
    return [...finals, interim].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  }, [finals, interim]);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data: Health) => setHealth(data))
      .catch(() =>
        setHealth({ ok: false, hasKey: false, model: "gemini-3.5-transcribe-live" }),
      );
  }, []);

  useEffect(() => {
    localStorage.setItem("live-transcribe.apiKey", apiKey);
  }, [apiKey]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [finals, interim]);

  useEffect(() => {
    return () => {
      void captureRef.current?.stop();
      clientRef.current.disconnect();
    };
  }, []);

  const needsKey = health && !health.hasKey;

  const stopAll = useCallback(async (nextStatus: Status = "idle") => {
    ignoreClose.current = true;
    readyWaiter.current?.(false);
    readyWaiter.current = null;
    const capture = captureRef.current;
    captureRef.current = null;
    if (capture) await capture.stop();
    clientRef.current.stop();
    clientRef.current.disconnect();
    setStatus(nextStatus);
    setSource(null);
    setPlaying(false);
    setFileName("");
    setProgress({ current: 0, duration: 0 });
    setInterim("");
  }, []);

  const beginSession = useCallback(
    async (nextSource: Exclude<Source, null>, file?: File) => {
      setError("");
      setStatus("connecting");
      setSource(nextSource);
      setInterim("");
      ignoreClose.current = false;

      const client = clientRef.current;
      const waitReady = new Promise<boolean>((resolve) => {
        readyWaiter.current = resolve;
      });

      try {
        await client.connect({
          onEvent: (event) => {
            if (event.type === "ready") {
              readyWaiter.current?.(true);
              readyWaiter.current = null;
              setStatus("live");
            } else if (event.type === "interim") {
              setInterim(event.text);
            } else if (event.type === "final") {
              setFinals((prev) => [...prev, event.text.trim()].filter(Boolean));
              setInterim("");
            } else if (event.type === "error") {
              readyWaiter.current?.(false);
              readyWaiter.current = null;
              setError(event.message);
              void stopAll("error");
            } else if (
              event.type === "closed" &&
              !ignoreClose.current &&
              event.reason !== "stopped" &&
              event.reason !== "socket"
            ) {
              void stopAll();
            }
          },
        });
        client.start({
          mode,
          language: language || undefined,
          apiKey: needsKey ? apiKey : undefined,
        });
        const ready = await waitReady;
        if (!ready) return;

        if (nextSource === "mic") {
          captureRef.current = await startMicCapture((chunk) => client.sendPcm(chunk));
          setPlaying(true);
          return;
        }

        if (!file) throw new Error("Choose an audio file first.");
        setFileName(file.name);
        const handle = await startFileCapture(
          file,
          (chunk) => client.sendPcm(chunk),
          () => {
            client.endAudio();
            setPlaying(false);
          },
        );
        captureRef.current = handle;
        setPlaying(true);
        const audio = handle.audio;
        const tick = () => {
          setProgress({
            current: audio.currentTime,
            duration: Number.isFinite(audio.duration) ? audio.duration : 0,
          });
        };
        audio.addEventListener("timeupdate", tick);
        audio.addEventListener("loadedmetadata", tick);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await stopAll("error");
        setError(message);
      }
    },
    [apiKey, language, mode, needsKey, stopAll],
  );

  const toggleFilePlayback = async () => {
    const audio = captureRef.current?.audio;
    if (!audio) return;
    if (audio.paused) {
      await audio.play();
      setPlaying(true);
    } else {
      audio.pause();
      clientRef.current.endAudio();
      setPlaying(false);
    }
  };

  const copyTranscript = async () => {
    if (!transcript) return;
    await navigator.clipboard.writeText(transcript);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const downloadTranscript = () => {
    if (!transcript) return;
    const blob = new Blob([transcript + "\n"], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transcript.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const busy = status === "connecting" || status === "live";

  return (
    <div className="min-h-[100dvh] bg-ink text-cream">
      <div className="mx-auto grid min-h-[100dvh] max-w-6xl grid-cols-1 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className="flex flex-col gap-6 overflow-y-auto border-b border-line px-5 py-6 lg:border-b-0 lg:border-r lg:px-6 lg:py-8">
          <div>
            <div className="flex items-center gap-2 text-live">
              <Waveform size={18} weight="bold" />
              <span className="text-sm font-medium">Live Transcribe</span>
            </div>
            <p className="mt-2 max-w-[28ch] text-sm leading-6 text-mute">
              Speak or play a file. Captions appear as the audio is heard.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              disabled={busy && source !== "mic"}
              onClick={() => {
                if (source === "mic") void stopAll();
                else void beginSession("mic");
              }}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-live px-4 text-sm font-semibold text-ink transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {source === "mic" && status === "live" ? (
                <>
                  <Square size={18} weight="fill" />
                  Stop mic
                </>
              ) : (
                <>
                  <Microphone size={18} weight="fill" />
                  {status === "connecting" && source === "mic"
                    ? "Connecting"
                    : "Start mic"}
                </>
              )}
            </button>

            <button
              type="button"
              disabled={busy && source !== "file"}
              onClick={() => {
                if (source === "file") void stopAll();
                else fileInputRef.current?.click();
              }}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-line bg-raised px-4 text-sm font-medium text-cream transition hover:border-mute active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <UploadSimple size={18} />
              {source === "file" ? "Stop file" : "Transcribe a file"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.wav,.mp3,.m4a,.ogg,.webm,.flac"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void beginSession("file", file);
              }}
            />
          </div>

          {source === "file" && fileName ? (
            <div className="rounded-xl border border-line bg-panel p-4">
              <p className="truncate text-sm">{fileName}</p>
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => void toggleFilePlayback()}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-cream text-ink transition active:scale-[0.98]"
                  aria-label={playing ? "Pause" : "Play"}
                >
                  {playing ? (
                    <Pause size={16} weight="fill" />
                  ) : (
                    <Play size={16} weight="fill" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="h-1 overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full bg-live"
                      style={{
                        width: `${
                          progress.duration
                            ? Math.min(100, (progress.current / progress.duration) * 100)
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-mute">
                    {formatTime(progress.current)} / {formatTime(progress.duration)}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <label className="flex flex-col gap-2 text-sm">
            <span className="text-mute">Formatting</span>
            <select
              value={mode}
              disabled={busy}
              onChange={(event) => setMode(event.target.value as TranscriptMode)}
              className="h-11 rounded-xl border border-line bg-raised px-3 text-cream outline-none focus:border-live"
            >
              <option value="smart">Smart (clean up fillers)</option>
              <option value="verbatim">Verbatim</option>
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="text-mute">Language</span>
            <select
              value={language}
              disabled={busy}
              onChange={(event) => setLanguage(event.target.value)}
              className="h-11 rounded-xl border border-line bg-raised px-3 text-cream outline-none focus:border-live"
            >
              {LANGUAGES.map((item) => (
                <option key={item.value || "auto"} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          {needsKey ? (
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-mute">Gemini API key</span>
              <input
                type="password"
                autoComplete="off"
                value={apiKey}
                disabled={busy}
                placeholder="Paste from AI Studio"
                onChange={(event) => setApiKey(event.target.value)}
                className="h-11 rounded-xl border border-line bg-raised px-3 text-cream outline-none placeholder:text-mute/70 focus:border-live"
              />
            </label>
          ) : null}

          <p className="text-xs leading-5 text-mute">
            Uses Gemini 3.5 Transcribe Live. The key stays on this machine.
          </p>
        </aside>

        <main className="flex min-h-0 flex-col px-5 py-6 lg:px-10 lg:py-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span
                className={`h-2 w-2 rounded-full ${
                  status === "live"
                    ? "bg-live"
                    : status === "connecting"
                      ? "bg-mute"
                      : status === "error"
                        ? "bg-red-400"
                        : "bg-line"
                }`}
              />
              <span className="text-mute">
                {status === "live"
                  ? source === "mic"
                    ? "Listening"
                    : playing
                      ? "Playing"
                      : "Paused"
                  : status === "connecting"
                    ? "Connecting to Gemini"
                    : status === "error"
                      ? "Something went wrong"
                      : "Idle"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void copyTranscript()}
                disabled={!transcript}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-line px-3 text-sm text-cream disabled:opacity-30"
              >
                <Copy size={16} />
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                type="button"
                onClick={downloadTranscript}
                disabled={!transcript}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-line px-3 text-sm text-cream disabled:opacity-30"
              >
                <DownloadSimple size={16} />
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setFinals([]);
                  setInterim("");
                }}
                disabled={!transcript}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-line px-3 text-sm text-cream disabled:opacity-30"
              >
                <Trash size={16} />
                Clear
              </button>
            </div>
          </div>

          {error ? (
            <p className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm leading-6 text-red-200">
              {error}
            </p>
          ) : null}

          <div
            ref={scrollerRef}
            className="mt-6 min-h-[50vh] flex-1 overflow-auto rounded-2xl border border-line bg-panel px-6 py-6 lg:px-10 lg:py-10"
          >
            {transcript ? (
              <p className="max-w-[62ch] text-xl leading-9">
                {finals.map((part, index) => (
                  <span key={`${index}-${part.slice(0, 12)}`}>{part} </span>
                ))}
                {interim ? (
                  <span className="italic text-mute">{interim}</span>
                ) : null}
              </p>
            ) : (
              <p className="max-w-[42ch] text-lg leading-8 text-mute">
                Start the mic or play a voice file. Draft words show in italic, then
                lock in as each phrase finishes.
              </p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
