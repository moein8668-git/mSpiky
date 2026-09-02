import { useEffect, useRef, useState } from "react";
import type { OverlaySnapshot } from "../dictation/dictation";
import { Overlay } from "./Overlay";
import { startStudioMic, type StudioMicHandle } from "../studio/mic-capture";

const idleSnapshot: OverlaySnapshot = {
  status: "idle",
  draft: "",
  commits: [],
  error: null,
  meter: 0,
  overlayVisible: false,
};

export function OverlayApp() {
  const [snapshot, setSnapshot] = useState<OverlaySnapshot>(idleSnapshot);
  const draggingRef = useRef(false);
  const captureRef = useRef<StudioMicHandle | null>(null);
  const liveRef = useRef(false);
  liveRef.current = snapshot.status === "listening";

  useEffect(() => {
    const api = window.mspiky;
    if (!api) return;
    return api.onSnapshot(setSnapshot);
  }, []);

  useEffect(() => {
    const api = window.mspiky;
    if (!api?.setClickThrough) return;
    let pass = true;
    const setPass = (next: boolean) => {
      if (next === pass) return;
      pass = next;
      api.setClickThrough(next);
    };

    function syncClickThrough(event: MouseEvent) {
      if (draggingRef.current) return;
      const target = event.target;
      const onHandle =
        target instanceof Element &&
        Boolean(target.closest(".overlay-drag-handle"));
      setPass(!onHandle);
    }

    function resetClickThrough() {
      setPass(true);
    }

    window.addEventListener("mousemove", syncClickThrough);
    document.addEventListener("mouseleave", resetClickThrough);
    return () => {
      window.removeEventListener("mousemove", syncClickThrough);
      document.removeEventListener("mouseleave", resetClickThrough);
      setPass(true);
    };
  }, []);

  useEffect(() => {
    const api = window.mspiky;
    if (!api) return;
    const holdMic =
      snapshot.status === "listening" || snapshot.status === "paused";

    if (!holdMic) {
      const capture = captureRef.current;
      captureRef.current = null;
      void capture?.stop();
      return;
    }

    if (captureRef.current) return;

    let cancelled = false;
    void (async () => {
      try {
        const settings = await api.captureSettings();
        if (cancelled) return;
        const capture = await startStudioMic(settings.micId || undefined, (chunk) => {
          if (liveRef.current) api.sendPcm(chunk);
        });
        if (cancelled) {
          await capture.stop();
          return;
        }
        captureRef.current = capture;
      } catch {
        if (!cancelled) api.failMic();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [snapshot.status]);

  return (
    <Overlay
      snapshot={snapshot}
      onDragChange={(active) => {
        draggingRef.current = active;
      }}
    />
  );
}
