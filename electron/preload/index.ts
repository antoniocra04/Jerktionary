import { contextBridge, ipcRenderer } from "electron";
import type { DesktopApi, MeetingRecord } from "./api";

function subscribe(channel: string, listener: () => void): () => void {
  const handler = () => listener();
  ipcRenderer.on(channel, handler);
  return () => {
    ipcRenderer.removeListener(channel, handler);
  };
}

const api: DesktopApi = {
  getAppVersion: () => ipcRenderer.invoke("app:getVersion"),
  getPlatform: () => ipcRenderer.invoke("app:getPlatform"),
  openExternal: (url: string) => ipcRenderer.invoke("shell:openExternal", url),
  setContentProtection: (enabled: boolean) =>
    ipcRenderer.invoke("window:setContentProtection", enabled),
  setWindowTitle: (title: string) => ipcRenderer.invoke("window:setTitle", title),
  setOverlayMode: (enabled: boolean) => ipcRenderer.invoke("window:setOverlayMode", enabled),
  requestMediaAccess: (hint) => ipcRenderer.invoke("app:requestMediaAccess", hint),
  onAnswerNow: (listener) => subscribe("hotkey:answer-now", listener),
  onToggleOverlay: (listener) => subscribe("hotkey:toggle-overlay", listener),
  onFullContextAnswer: (listener) => subscribe("hotkey:full-context-answer", listener),
  listMeetings: () => ipcRenderer.invoke("meetings:list"),
  saveMeeting: (record: MeetingRecord) => ipcRenderer.invoke("meetings:save", record),
  deleteMeeting: (id: string) => ipcRenderer.invoke("meetings:delete", id)
};

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld("desktopAPI", api);
} else {
  window.desktopAPI = api;
}
