import {
  app,
  BrowserWindow,
  desktopCapturer,
  globalShortcut,
  ipcMain,
  session,
  shell,
  type Rectangle
} from "electron";
import { electronApp, optimizer } from "@electron-toolkit/utils";
import { deleteMeeting, listMeetings, saveMeeting } from "./meetings-store";
import { createMainWindow } from "./window";
import type { MeetingRecord } from "../preload/api";

let mainWindow: BrowserWindow | null = null;

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

app.whenReady().then(() => {
  electronApp.setAppUserModelId("local.jerktionary.desktop");
  // The custom display-media handler is only needed on Windows for
  // `audio: "loopback"` system-audio capture. On macOS 13+ Electron uses
  // ScreenCaptureKit natively when no handler is registered; on Linux there is
  // no system-audio path yet.
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

  mainWindow = createMainWindow();

  // Global so they work while a call app is focused: force-answer the last
  // spoken sentence, and flip the compact always-on-top overlay.
  globalShortcut.register("Control+Shift+Space", () => {
    mainWindow?.webContents.send("hotkey:answer-now");
  });
  globalShortcut.register("Control+Shift+O", () => {
    mainWindow?.webContents.send("hotkey:toggle-overlay");
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
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
