/** Safe renderer bridge for desktop collaboration configuration and shutdown. */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("txthero", {
  websocketUrl: process.env.NEXT_PUBLIC_WS_URL || "ws://127.0.0.1:8000",
  version: () => ipcRenderer.invoke("txthero:version"),
  checkForUpdates: () => ipcRenderer.invoke("txthero:check-for-updates"),
  installUpdate: () => ipcRenderer.invoke("txthero:install-update"),
  setUnsavedChanges: (dirty) => ipcRenderer.send("txthero:unsaved-changes", dirty === true),
  onWillQuit: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("txthero:will-quit", listener);
    return () => ipcRenderer.removeListener("txthero:will-quit", listener);
  },
});
