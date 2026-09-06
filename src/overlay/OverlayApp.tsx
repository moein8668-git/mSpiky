import { useEffect, useRef, useState } from "react";
import { playChimeTone, type ChimeKind } from "../audio/chime";
import type { OverlaySnapshot } from "../dictation/dictation";
import { Overlay } from "./Overlay";
import { startStudioMic, type StudioMicHandle } from "../studio/mic-capture";
import "./mspiky-api";

const idleSnapshot: OverlaySnapshot = {
  status: "idle",
  draft: "",
  commits: [],
  error: null,
  meter: 0,
  overlayVisible: false,
};

function isLiveStatus(status: OverlaySnapshot["status"]) {
  return status === "listening" || status === "paused";
}

export function OverlayApp() {
  const [snapshot, setSnapshot] = useState<OverlaySnapshot>(idleSnapshot);
  const captureRef = useRef<StudioMicHandle | null>(null);
  const liveRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  liveRef.current = snapshot.status === "listening";

  useEffect(() => {
    const api = window.mspiky;
    if (!api) return;
    return api.onSnapshot(setSnapshot);
  }, []);

  useEffect(() => {
    const api = window.mspiky;
    if (!api?.onChime) return;
    return api.onChime((kind: ChimeKind) => {
      void (async () => {
        try {
          const context = audioContextRef.current ?? new AudioContext();
          audioContextRef.current = context;
          await context.resume();
          playChimeTone(context, kind);
        } catch {
          // Chimes are optional feedback.
        }
      })();
    });
  }, []);

  useEffect(() => {
    const api = window.mspiky;
    if (!api) return;
    const holdMic = isLiveStatus(snapshot.status);

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

  return <Overlay snapshot={snapshot} />;
}
