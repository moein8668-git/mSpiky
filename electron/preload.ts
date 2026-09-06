import { contextBridge, ipcRenderer } from "electron";
import type { ChimeKind } from "../src/audio/chime";
import type { AppSettings } from "../src/settings/app-settings";
import type { OverlaySnapshot } from "../src/dictation/dictation";

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
  onChime(listener: (kind: ChimeKind) => void) {
    const handler = (_event: Electron.IpcRendererEvent, kind: ChimeKind) => {
      listener(kind);
    };
    ipcRenderer.on("mspiky:chime", handler);
    return () => {
      ipcRenderer.removeListener("mspiky:chime", handler);
    };
  },
  sendPcm(pcm: Uint8Array) {
    ipcRenderer.send("mspiky:overlay-pcm", pcm);
  },
  failMic() {
    ipcRenderer.send("mspiky:overlay-mic-fail");
  },
  captureSettings() {
    return ipcRenderer.invoke("mspiky:settings-get") as Promise<
      Pick<AppSettings, "micId" | "mode" | "chimesEnabled">
    >;
  },
});
