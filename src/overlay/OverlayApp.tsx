import { useEffect, useState } from "react";
import type { OverlaySnapshot } from "../dictation/dictation";
import { Overlay } from "./Overlay";

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

  useEffect(() => {
    const api = window.mspiky;
    if (!api) return;
    return api.onSnapshot(setSnapshot);
  }, []);

  return (
    <Overlay
      snapshot={snapshot}
      onPause={() => window.mspiky?.pause()}
      onResume={() => window.mspiky?.resume()}
    />
  );
}
