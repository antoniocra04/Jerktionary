import {
  app,
  BrowserWindow,
  desktopCapturer,
  globalShortcut,
  ipcMain,
  session,
  shell,
  systemPreferences,
  type Rectangle
} from "electron";
import { electronApp, optimizer } from "@electron-toolkit/utils";
import { deleteMeeting, listMeetings, saveMeeting } from "./meetings-store";
import { createMainWindow } from "./window";
import type { MeetingRecord } from "../preload/api";

let mainWindow: BrowserWindow | null = null;

// Global shortcuts and IPC can fire after the window was closed (macOS keeps
// the app running); sending to a destroyed webContents throws
// "TypeError: Object has been destroyed".
function sendToMainWindow(channel: string): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel);
  }
}

function spawnMainWindow(): void {
  mainWindow = createMainWindow();
  mainWindow.on("closed", () => {
    mainWindow = null;
    overlayRestore = null;
  });
}

// Bounds/minimum-size to restore when leaving the compact overlay mode.
let overlayRestore: { bounds: Rectangle; minimumSize: [number, number] } | null = null;

const OVERLAY_SIZE = { width: 460, height: 320 } as const;
const OVERLAY_MIN_SIZE = [360, 220] as const;

// Default name shown by the OS (Task Manager apps view, menus). The user can
// override the window title at runtime from settings.
app.setName("Jerktionary");

ipcMain.handle("app:getVersion", () => app.getVersion());
ipcMain.handle("app:getPlatform", () => process.platform);
ipcMain.handle("shell:openExternal", async (_, url: string) => {
  if (url.startsWith("https://") || url.startsWith("http://127.0.0.1:8000")) {
    await shell.openExternal(url);
  }
});
ipcMain.handle("window:setContentProtection", (_, enabled: boolean) => {
  const on = Boolean(enabled);
  mainWindow?.setContentProtection(on);
  mainWindow?.setSkipTaskbar(on);
});
ipcMain.handle("window:setTitle", (_, title: string) => {
  const value = String(title).trim();
  if (value) {
    mainWindow?.setTitle(value);
  }
});
ipcMain.handle("window:setOverlayMode", (_, enabled: boolean) => {
  const window = mainWindow;
  if (!window) {
    return;
  }
  if (enabled && overlayRestore === null) {
    overlayRestore = { bounds: window.getBounds(), minimumSize: [1024, 680] };
    window.setMinimumSize(OVERLAY_MIN_SIZE[0], OVERLAY_MIN_SIZE[1]);
    const { x, y } = window.getBounds();
    window.setBounds({ x, y, ...OVERLAY_SIZE });
    // "screen-saver" keeps the card above full-screen call windows too.
    window.setAlwaysOnTop(true, "screen-saver");
  } else if (!enabled && overlayRestore !== null) {
    window.setAlwaysOnTop(false);
    window.setMinimumSize(...overlayRestore.minimumSize);
    window.setBounds(overlayRestore.bounds);
    overlayRestore = null;
  }
});
ipcMain.handle("meetings:list", () => listMeetings());
ipcMain.handle("meetings:save", (_, record: MeetingRecord) => saveMeeting(record));
ipcMain.handle("meetings:delete", (_, id: string) => deleteMeeting(id));

ipcMain.handle("app:requestMediaAccess", async (_, hint: "microphone" | "screen") => {
  if (process.platform !== "darwin") {
    return true;
  }
  if (hint === "screen") {
    return true; // getDisplayMedia triggers its own native picker
  }
  const status = systemPreferences.getMediaAccessStatus("microphone");
  if (status === "granted") {
    return true;
  }
  return systemPreferences.askForMediaAccess("microphone");
});

app.whenReady().then(async () => {
  electronApp.setAppUserModelId("local.jerktionary.desktop");

  // Request microphone permission before Chromium starts so that
  // getUserMedia picks up the TCC state immediately. On macOS a TCC
  // grant that happens after the renderer process is already running
  // may be ignored by Chromium's internal permission cache.
  if (process.platform === "darwin") {
    const micStatus = systemPreferences.getMediaAccessStatus("microphone");
    if (micStatus !== "granted") {
      await systemPreferences.askForMediaAccess("microphone");
    }
  }

  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    const allowed = ["media", "mediaKeySystem"];
    callback(allowed.includes(permission));
  });

  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    if (permission === "media") return true;
    return false;
  });

  // The custom display-media handler is only needed on Windows for
  // `audio: "loopback"` system-audio capture (loopback audio is
  // Windows-only in Electron 31). On macOS no handler is registered, so
  // getDisplayMedia rejects and the renderer falls back to virtual-device
  // (BlackHole) capture; on Linux monitor sources are used instead.
  if (process.platform === "win32") {
    session.defaultSession.setDisplayMediaRequestHandler(async (_request, callback) => {
      const sources = await desktopCapturer.getSources({ types: ["screen"] });
      const primaryScreen = sources[0];

      callback({
        audio: "loopback",
        ...(primaryScreen ? { video: primaryScreen } : {})
      });
    });
  }

  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  spawnMainWindow();

  // Global so they work while a call app is focused: force-answer the last
  // spoken sentence, flip the compact always-on-top overlay, and answer with
  // full transcript context.
  globalShortcut.register("Control+Shift+Space", () => {
    sendToMainWindow("hotkey:answer-now");
  });
  globalShortcut.register("Control+Shift+O", () => {
    sendToMainWindow("hotkey:toggle-overlay");
  });
  globalShortcut.register("Control+Shift+Enter", () => {
    sendToMainWindow("hotkey:full-context-answer");
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      spawnMainWindow();
    }
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("web-contents-created", (_, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://") || url.startsWith("http://127.0.0.1:8000")) {
      void shell.openExternal(url);
    }

    return { action: "deny" };
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

export { mainWindow };
