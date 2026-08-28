import { overlayChrome } from "../shell/shell";

export function Overlay() {
  return (
    <div className="flex h-full items-center gap-3 px-4 py-2">
      <span className="text-xs font-medium uppercase tracking-wide text-mute">
        mSpiky
      </span>
      <span className="text-sm text-cream">{overlayChrome.status}</span>
    </div>
  );
}
