import { contextBridge, ipcRenderer } from "electron";
import type { SessionStartOptions } from "../src/dictation/dictation";
import type { StudioCaptionSnapshot } from "../src/studio/studio-captions";

contextBridge.exposeInMainWorld("mspikyStudio", {
  hasKey() {
    return ipcRenderer.invoke("mspiky:key-has") as Promise<boolean>;
  },
  saveKey(value: string) {
    return ipcRenderer.invoke("mspiky:key-save", value) as Promise<void>;
  },
  onKeyMissing(listener: (message: string) => void) {
    const handler = (_event: Electron.IpcRendererEvent, message: string) => {
      listener(message);
    };
    ipcRenderer.on("mspiky:studio-key-missing", handler);
    return () => {
      ipcRenderer.removeListener("mspiky:studio-key-missing", handler);
    };
  },
  startCaptions(options: SessionStartOptions) {
    return ipcRenderer.invoke("mspiky:studio-start", options) as Promise<void>;
  },
  stopCaptions() {
    return ipcRenderer.invoke("mspiky:studio-stop") as Promise<void>;
  },
  failCaptions(message: string) {
    return ipcRenderer.invoke("mspiky:studio-fail", message) as Promise<void>;
  },
  sendPcm(pcm: Uint8Array) {
    ipcRenderer.send("mspiky:studio-pcm", pcm);
  },
  onCaptions(listener: (snapshot: StudioCaptionSnapshot) => void) {
    const handler = (
      _event: Electron.IpcRendererEvent,
      snapshot: StudioCaptionSnapshot,
    ) => {
      listener(snapshot);
    };
    ipcRenderer.on("mspiky:studio-captions", handler);
    return () => {
      ipcRenderer.removeListener("mspiky:studio-captions", handler);
    };
  },
});
