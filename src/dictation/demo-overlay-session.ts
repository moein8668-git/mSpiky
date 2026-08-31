import { createFakeSession } from "./fake-session";
import type { SessionAdapter } from "./dictation";

export function createDemoOverlaySession(): SessionAdapter {
  const fake = createFakeSession();
  let demoTimer: ReturnType<typeof setTimeout> | undefined;

  return {
    start(listener) {
      fake.session.start(listener);
      demoTimer = setTimeout(() => {
        fake.emitGemini({ type: "interim", text: "hel" });
        fake.emitGemini({ finished: true, text: "hello" });
      }, 200);
    },
    sendPcm(pcm) {
      fake.session.sendPcm(pcm);
    },
    sendEndOfAudio() {
      fake.session.sendEndOfAudio();
    },
    stop() {
      if (demoTimer) clearTimeout(demoTimer);
      fake.session.stop();
    },
  };
}
