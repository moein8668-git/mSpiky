import { contextBridge, ipcRenderer } from "electron";

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
});
