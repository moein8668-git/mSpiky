import { contextBridge, ipcRenderer } from "electron";
import type { OverlaySnapshot } from "../src/dictation/dictation";
import type { SessionSettings } from "../src/settings/session-settings";

contextBridge.exposeInMainWorld("mspiky", {
  onSnapshot(listener: (snapshot: OverlaySnapshot) => void) {
    const handler = (_event: Electron.IpcRendererEvent, snapshot: OverlaySnapshot) => {
      listener(snapshot);
    };
    ipcRenderer.on("mspiky:overlay-snapshot", handler);
    return () => {
      ipcRenderer.removeListener("mspiky:overlay-snapshot", handler);
    };
  },
  sendPcm(pcm: Uint8Array) {
    ipcRenderer.send("mspiky:overlay-pcm", pcm);
  },
  failMic() {
    ipcRenderer.send("mspiky:overlay-mic-fail");
  },
  captureSettings() {
    return ipcRenderer.invoke("mspiky:settings-get") as Promise<SessionSettings>;
  },
});
