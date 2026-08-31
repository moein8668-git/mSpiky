import { overlayChrome } from "../shell/shell";

function statusLabel(status: "idle" | "listening" | "paused") {
  return overlayChrome.statusLabel[status];
}

export function Overlay({
  snapshot,
  onPause,
  onResume,
}: {
  snapshot: {
    status: "idle" | "listening" | "paused";
    draft: string;
    commits: string[];
    meter: number;
  };
  onPause: () => void;
  onResume: () => void;
}) {
  const paused = snapshot.status === "paused";

  return (
    <div className="flex h-full items-center gap-3 px-4 py-2">
      <span className="text-xs font-medium uppercase tracking-wide text-mute">
        mSpiky
      </span>
      <span className="text-sm text-cream">{statusLabel(snapshot.status)}</span>
      <div
        className="h-2 w-12 overflow-hidden rounded-full bg-line"
        aria-label="Mic level"
      >
        <div
          className="h-full bg-live transition-all"
          style={{ width: `${Math.round(snapshot.meter * 100)}%` }}
        />
      </div>
      {snapshot.draft ? (
        <span className="text-sm italic text-mute">{snapshot.draft}</span>
      ) : null}
      {snapshot.commits.length > 0 ? (
        <span className="text-sm text-cream">{snapshot.commits.join(" ")}</span>
      ) : null}
      {snapshot.status === "listening" ? (
        <button
          type="button"
          className="overlay-control rounded px-2 py-0.5 text-xs text-cream"
          onClick={onPause}
        >
          Pause
        </button>
      ) : null}
      {paused ? (
        <button
          type="button"
          className="overlay-control rounded px-2 py-0.5 text-xs text-cream"
          onClick={onResume}
        >
          Resume
        </button>
      ) : null}
    </div>
  );
}
