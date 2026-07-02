import { contextBridge, ipcRenderer } from "electron";
import type { DesktopApi } from "./api";

const api: DesktopApi = {
  getAppVersion: () => ipcRenderer.invoke("app:getVersion"),
  getPlatform: () => ipcRenderer.invoke("app:getPlatform"),
  openExternal: (url: string) => ipcRenderer.invoke("shell:openExternal", url),
  setContentProtection: (enabled: boolean) =>
    ipcRenderer.invoke("window:setContentProtection", enabled),
  setWindowTitle: (title: string) => ipcRenderer.invoke("window:setTitle", title)
};

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld("desktopAPI", api);
} else {
  window.desktopAPI = api;
}
