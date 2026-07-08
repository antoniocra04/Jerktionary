import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

/**
 * Tests for the platform gating of setDisplayMediaRequestHandler.
 *
 * We mock the Electron API and all imported modules so we can control
 * the whenReady callback and verify the platform-gate logic.
 */

const setHandlerSpy = vi.fn();
const mockWindow = {
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
        setDisplayMediaRequestHandler: setHandlerSpy
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
      register: vi.fn(),
      unregisterAll: vi.fn()
    },
    ipcMain: {
      handle: vi.fn()
    },
    shell: {
      openExternal: vi.fn().mockResolvedValue(undefined)
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
});
