import { app, BrowserWindow, desktopCapturer, ipcMain, session, shell } from "electron";
import { electronApp, optimizer } from "@electron-toolkit/utils";
import { createMainWindow } from "./window";

let mainWindow: BrowserWindow | null = null;

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

app.whenReady().then(() => {
  electronApp.setAppUserModelId("local.jerktionary.desktop");
  session.defaultSession.setDisplayMediaRequestHandler(async (_request, callback) => {
    if (process.platform !== "win32") {
      callback({});
      return;
    }

    const sources = await desktopCapturer.getSources({ types: ["screen"] });
    const primaryScreen = sources[0];

    callback({
      audio: "loopback",
      ...(primaryScreen ? { video: primaryScreen } : {})
    });
  });

  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  mainWindow = createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    }
  });
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
