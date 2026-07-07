import { join } from "node:path";
import { BrowserWindow } from "electron";
import { is } from "@electron-toolkit/utils";

export function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: "#f2ede3",
    title: "Jerktionary",
    show: false,
    skipTaskbar: true,
    icon: join(__dirname, "../../build/icon.png"),
    webPreferences: {
      preload: join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  // Stealth mode: exclude the window from screen capture / screen sharing (Windows
  // WDA_EXCLUDEFROMCAPTURE) and keep it out of the taskbar so the app icon doesn't
  // reveal it on a shared screen. The user still sees it locally. Toggleable at runtime.
  window.setContentProtection(true);

  // Don't let the renderer's document.title leak the real name to the OS title —
  // the title is controlled by the masking setting instead.
  window.webContents.on("page-title-updated", (event) => event.preventDefault());

  window.once("ready-to-show", () => {
    window.show();
  });

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL);
    window.webContents.openDevTools({ mode: "detach" });
  } else {
    void window.loadFile(join(__dirname, "../renderer/index.html"));
  }

  return window;
}
