import { useLayoutEffect, useRef } from "react";
import { DotsSixVertical } from "@phosphor-icons/react";
import type { OverlaySnapshot } from "../dictation/dictation";
import { overlayChrome } from "../shell/shell";
import {
  overlayText,
  overlayTextTail,
  scrollOverlayTextToLatest,
} from "./overlay-text";
import "./overlay-drag.css";

function statusLabel(status: OverlaySnapshot["status"]) {
  return overlayChrome.statusLabel[status];
}

export function Overlay({ snapshot }: { snapshot: OverlaySnapshot }) {
  const spoken = overlayTextTail(
    overlayText(snapshot.commits, snapshot.draft),
  );
  const spokenRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (spokenRef.current) scrollOverlayTextToLatest(spokenRef.current);
  }, [spoken]);

  return (
    <div className="flex h-full min-w-0 items-center gap-3 overflow-hidden px-3 py-2">
      <div
        className="overlay-drag-handle"
        role="button"
        aria-label="Move overlay"
        title="Drag to move"
      >
        <DotsSixVertical size={18} weight="bold" aria-hidden />
      </div>
      <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-mute">
        mSpiky
      </span>
      <span className="shrink-0 text-sm text-cream">
        {statusLabel(snapshot.status)}
      </span>
      <div
        className="h-2 w-12 shrink-0 overflow-hidden rounded-full bg-line"
        aria-label="Mic level"
      >
        <div
          className="h-full bg-live transition-all"
          style={{ width: `${Math.round(snapshot.meter * 100)}%` }}
        />
      </div>
      {spoken ? (
        <span
          ref={spokenRef}
          className="overlay-text min-w-0 flex-1 text-sm text-cream"
          dir="auto"
        >
          <span className="overlay-text-inner">{spoken}</span>
        </span>
      ) : (
        <span className="min-w-0 flex-1" />
      )}
      {snapshot.error ? (
        <span
          className="max-w-[12rem] shrink-0 truncate text-sm text-live"
          role="alert"
        >
          {snapshot.error}
        </span>
      ) : null}
    </div>
  );
}
