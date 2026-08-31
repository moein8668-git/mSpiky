import { contextBridge, ipcRenderer } from "electron";
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
  pause() {
    ipcRenderer.send("mspiky:overlay-pause");
  },
  resume() {
    ipcRenderer.send("mspiky:overlay-resume");
  },
});
