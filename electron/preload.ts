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
  setClickThrough(pass: boolean) {
    ipcRenderer.sendSync("mspiky:overlay-click-through", pass);
  },
  startOverlayDrag(screenX: number, screenY: number) {
    ipcRenderer.send("mspiky:overlay-drag-start", screenX, screenY);
  },
  moveOverlayDrag(screenX: number, screenY: number) {
    ipcRenderer.send("mspiky:overlay-drag-move", screenX, screenY);
  },
  endOverlayDrag() {
    ipcRenderer.send("mspiky:overlay-drag-end");
  },
});
