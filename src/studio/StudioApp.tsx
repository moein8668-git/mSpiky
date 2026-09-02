import { useEffect, useState } from "react";
import { FirstRun } from "./FirstRun";
import { Studio } from "./Studio";
import { listMics } from "./mic-capture";

export function StudioApp() {
  const [ready, setReady] = useState(false);
  const [firstRunComplete, setFirstRunComplete] = useState(true);
  const [hasKey, setHasKey] = useState(false);
  const [platform, setPlatform] = useState("");

  useEffect(() => {
    const api = window.mspikyStudio;
    if (!api) return;
    void Promise.all([api.hasKey(), api.getSettings(), api.getPlatform()]).then(
      ([key, settings, nextPlatform]) => {
        setHasKey(key);
        setFirstRunComplete(settings.firstRunComplete);
        setPlatform(nextPlatform);
        setReady(true);
      },
    );
  }, []);

  if (!ready) return null;

  if (!firstRunComplete) {
    return (
      <FirstRun
        hasKey={hasKey}
        platform={platform}
        onSaveKey={async (value) => {
          await window.mspikyStudio?.saveKey(value);
          setHasKey(true);
        }}
        onRequestMic={async () => {
          await listMics();
        }}
        onOpenAccessibility={() => {
          void window.mspikyStudio?.openAccessibilitySettings();
        }}
        onComplete={() => {
          void window.mspikyStudio?.completeFirstRun();
          setFirstRunComplete(true);
        }}
      />
    );
  }

  return <Studio />;
}
