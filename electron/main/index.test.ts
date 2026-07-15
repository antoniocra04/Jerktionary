import { describe, expect, it, vi, beforeEach, afterEach, type Mock } from "vitest";

/**
 * Tests for the platform gating of setDisplayMediaRequestHandler.
 *
 * We mock the Electron API and all imported modules so we can control
 * the whenReady callback and verify the platform-gate logic.
 */

const setHandlerSpy = vi.fn();
const setPermissionHandlerSpy = vi.fn();
const setPermissionCheckHandlerSpy = vi.fn();
const globalShortcutRegisterSpy = vi.fn();
const globalShortcutUnregisterAllSpy = vi.fn();
const mockWindow = {
  isDestroyed: vi.fn().mockReturnValue(false),
  setContentProtection: vi.fn(),
  setSkipTaskbar: vi.fn(),
  setTitle: vi.fn(),
  getBounds: vi.fn().mockReturnValue({ x: 0, y: 0, width: 1280, height: 820 }),
  setBounds: vi.fn(),
  setMinimumSize: vi.fn(),
  setAlwaysOnTop: vi.fn(),
  webContents: {
    on: vi.fn(),
    send: vi.fn(),
    openDevTools: vi.fn()
  },
  on: vi.fn(),
  once: vi.fn(),
  loadURL: vi.fn().mockResolvedValue(undefined),
  loadFile: vi.fn().mockResolvedValue(undefined),
  show: vi.fn()
};

// Mock the window module
vi.mock("./window", () => ({
  createMainWindow: vi.fn(() => mockWindow)
}));

// Mock the meetings-store module
vi.mock("./meetings-store", () => ({
  listMeetings: vi.fn().mockResolvedValue([]),
  saveMeeting: vi.fn().mockResolvedValue(undefined),
  deleteMeeting: vi.fn().mockResolvedValue(undefined)
}));

let whenReadyCb: (() => void) | null = null;

vi.mock("electron", () => {
  return {
    session: {
      defaultSession: {
        setDisplayMediaRequestHandler: setHandlerSpy,
        setPermissionRequestHandler: setPermissionHandlerSpy,
        setPermissionCheckHandler: setPermissionCheckHandlerSpy
      }
    },
    app: {
      whenReady: vi.fn().mockImplementation(() => {
        return {
          then: (cb: () => void) => {
            whenReadyCb = cb;
            return { catch: vi.fn() };
          }
        };
      }),
      on: vi.fn(),
      setName: vi.fn(),
      getVersion: vi.fn().mockReturnValue("0.0.0"),
      quit: vi.fn()
    },
    BrowserWindow: {
      getAllWindows: vi.fn().mockReturnValue([])
    },
    desktopCapturer: {
      getSources: vi.fn().mockResolvedValue([{ id: "screen:0:0" }])
    },
    globalShortcut: {
      register: globalShortcutRegisterSpy,
      unregisterAll: globalShortcutUnregisterAllSpy
    },
    ipcMain: {
      handle: vi.fn()
    },
    shell: {
      openExternal: vi.fn().mockResolvedValue(undefined)
    },
    systemPreferences: {
      getMediaAccessStatus: vi.fn().mockReturnValue("granted"),
      askForMediaAccess: vi.fn().mockResolvedValue(true)
    }
  };
});

vi.mock("@electron-toolkit/utils", () => ({
  electronApp: {
    setAppUserModelId: vi.fn()
  },
  optimizer: {
    watchWindowShortcuts: vi.fn()
  },
  is: {
    dev: false
  }
}));

describe("setDisplayMediaRequestHandler platform gate", () => {
  let originalPlatform: string;

  beforeEach(() => {
    vi.resetModules();
    setHandlerSpy.mockReset();
    setPermissionHandlerSpy.mockReset();
    setPermissionCheckHandlerSpy.mockReset();
    globalShortcutRegisterSpy.mockReset();
    globalShortcutUnregisterAllSpy.mockReset();
    mockWindow.webContents.send.mockReset();
    whenReadyCb = null;
    originalPlatform = process.platform;
  });

  afterEach(() => {
    Object.defineProperty(process, "platform", {
      value: originalPlatform,
      configurable: true
    });
  });

  it("registers the handler on Windows (win32)", async () => {
    Object.defineProperty(process, "platform", {
      value: "win32",
      configurable: true
    });

    await import("./index");

    expect(whenReadyCb).not.toBeNull();
    whenReadyCb!();

    expect(setHandlerSpy).toHaveBeenCalledTimes(1);
  });

  it("does NOT register the handler on macOS (darwin)", async () => {
    Object.defineProperty(process, "platform", {
      value: "darwin",
      configurable: true
    });

    await import("./index");

    expect(whenReadyCb).not.toBeNull();
    whenReadyCb!();

    expect(setHandlerSpy).not.toHaveBeenCalled();
  });

  it("does NOT register the handler on Linux", async () => {
    Object.defineProperty(process, "platform", {
      value: "linux",
      configurable: true
    });

    await import("./index");

    expect(whenReadyCb).not.toBeNull();
    whenReadyCb!();

    expect(setHandlerSpy).not.toHaveBeenCalled();
  });

  it("registers permission handler for media on all platforms", async () => {
    Object.defineProperty(process, "platform", {
      value: "darwin",
      configurable: true
    });

    await import("./index");

    expect(whenReadyCb).not.toBeNull();
    whenReadyCb!();

    expect(setPermissionHandlerSpy).toHaveBeenCalledTimes(1);

    const callbackSpy = vi.fn();
    const handler = setPermissionHandlerSpy.mock.calls[0][0];
    handler(null, "media", callbackSpy);
    expect(callbackSpy).toHaveBeenCalledWith(true);

    callbackSpy.mockReset();
    handler(null, "geolocation", callbackSpy);
    expect(callbackSpy).toHaveBeenCalledWith(false);
  });

  it("permission check handler allows media, denies other permissions", async () => {
    Object.defineProperty(process, "platform", {
      value: "darwin",
      configurable: true
    });

    await import("./index");

    expect(whenReadyCb).not.toBeNull();
    whenReadyCb!();

    expect(setPermissionCheckHandlerSpy).toHaveBeenCalledTimes(1);

    const checkHandler = setPermissionCheckHandlerSpy.mock.calls[0][0];
    expect(checkHandler(null, "media")).toBe(true);
    expect(checkHandler(null, "geolocation")).toBe(false);
    expect(checkHandler(null, "notifications")).toBe(false);
  });
});

describe("global shortcut: full-context-answer", () => {
  let originalPlatform: string;

  beforeEach(() => {
    vi.resetModules();
    globalShortcutRegisterSpy.mockReset();
    globalShortcutUnregisterAllSpy.mockReset();
    mockWindow.webContents.send.mockReset();
    whenReadyCb = null;
    originalPlatform = process.platform;
  });

  afterEach(() => {
    Object.defineProperty(process, "platform", {
      value: originalPlatform,
      configurable: true
    });
  });

  it("registers Control+Shift+Enter on Windows/Linux", async () => {
    Object.defineProperty(process, "platform", {
      value: "win32",
      configurable: true
    });

    await import("./index");
    expect(whenReadyCb).not.toBeNull();
    whenReadyCb!();

    const calls = globalShortcutRegisterSpy.mock.calls.map(
      (call) => call[0] as string
    );
    expect(calls).toContain("Control+Shift+Enter");
  });

  it("registers Control+Shift+Enter on macOS too", async () => {
    Object.defineProperty(process, "platform", {
      value: "darwin",
      configurable: true
    });

    await import("./index");
    expect(whenReadyCb).not.toBeNull();
    whenReadyCb!();

    const calls = globalShortcutRegisterSpy.mock.calls.map(
      (call) => call[0] as string
    );
    expect(calls).toContain("Control+Shift+Enter");
  });

  it("does not send to a destroyed window", async () => {
    Object.defineProperty(process, "platform", {
      value: "darwin",
      configurable: true
    });

    await import("./index");
    expect(whenReadyCb).not.toBeNull();
    whenReadyCb!();

    mockWindow.isDestroyed.mockReturnValueOnce(true);

    const answerNowCall = globalShortcutRegisterSpy.mock.calls.find(
      (call) => (call[0] as string) === "Control+Shift+Space"
    );
    expect(answerNowCall).toBeDefined();
    (answerNowCall![1] as () => void)();

    expect(mockWindow.webContents.send).not.toHaveBeenCalled();
  });

  it("sends hotkey:full-context-answer IPC on activation", async () => {
    Object.defineProperty(process, "platform", {
      value: "win32",
      configurable: true
    });

    await import("./index");
    expect(whenReadyCb).not.toBeNull();
    whenReadyCb!();

    // Find the full-context-answer register call and trigger its callback
    const fullContextCall = globalShortcutRegisterSpy.mock.calls.find(
      (call) => (call[0] as string) === "Control+Shift+Enter"
    );
    expect(fullContextCall).toBeDefined();

    const handler = fullContextCall![1] as () => void;
    handler();

    expect(mockWindow.webContents.send).toHaveBeenCalledWith(
      "hotkey:full-context-answer"
    );
  });

  it("unregisters all shortcuts on will-quit", async () => {
    Object.defineProperty(process, "platform", {
      value: "win32",
      configurable: true
    });

    const electron = await import("electron");

    await import("./index");

    // The will-quit handler is registered at module top-level (outside whenReady).
    const onMock = electron.app.on as Mock;
    const willQuitCall = onMock.mock.calls.find(
      (call) => call[0] === "will-quit"
    ) as [string, () => void] | undefined;
    expect(willQuitCall).toBeDefined();

    const willQuitHandler = willQuitCall![1];
    willQuitHandler();

    expect(globalShortcutUnregisterAllSpy).toHaveBeenCalled();
  });
});
