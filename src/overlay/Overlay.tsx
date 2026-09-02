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

type OverlayProps = {
  snapshot: OverlaySnapshot;
  onDragChange?: (dragging: boolean) => void;
};

function beginOverlayDrag(
  screenX: number,
  screenY: number,
  onDragChange?: (dragging: boolean) => void,
) {
  const api = window.mspiky;
  if (!api) return;
  onDragChange?.(true);
  api.setClickThrough(false);
  api.startOverlayDrag(screenX, screenY);

  function onMove(event: PointerEvent) {
    api?.moveOverlayDrag(event.screenX, event.screenY);
  }

  function onUp() {
    api?.endOverlayDrag();
    api?.setClickThrough(true);
    onDragChange?.(false);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
  }

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
}

export function Overlay({ snapshot, onDragChange }: OverlayProps) {
  const spoken = overlayTextTail(
    overlayText(snapshot.commits, snapshot.draft),
  );
  const spokenRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (spokenRef.current) scrollOverlayTextToLatest(spokenRef.current);
  }, [spoken]);

  return (
    <div className="flex h-full min-w-0 items-center gap-3 overflow-hidden px-3 py-2">
      <button
        type="button"
        className="overlay-drag-handle"
        aria-label="Move overlay"
        title="Drag to move"
        onPointerDown={(event) => {
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          beginOverlayDrag(event.screenX, event.screenY, onDragChange);
        }}
      >
        <DotsSixVertical size={18} weight="bold" aria-hidden />
      </button>
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
