import { describe, expect, it, vi, beforeEach } from "vitest";
import { AudioCaptureService } from "./audio-capture-service";

// Mock the mac-audio-utils module so tests are deterministic.
vi.mock("./mac-audio-utils", () => ({
  detectVirtualAudioDevice: vi.fn(),
  hasMultiOutputDevice: vi.fn(),
  KNOWN_VIRTUAL_DEVICES: ["BlackHole", "Soundflower", "Loopback"],
  getDeviceInstallUrl: vi.fn(),
  MULTI_OUTPUT_HELP_URL: "https://support.apple.com/guide/audio-midi-setup"
}));

import { detectVirtualAudioDevice } from "./mac-audio-utils";

// Helper: create a minimal mock MediaStreamTrack
function mockTrack(kind: "audio" | "video"): MediaStreamTrack {
  return {
    kind,
    stop: vi.fn(),
    readyState: "live",
    label: `${kind}-track`,
    enabled: true,
    muted: false,
    id: `${kind}-1`,
    onended: null,
    onmute: null,
    onunmute: null,
    applyConstraints: vi.fn(),
    getCapabilities: vi.fn(),
    getConstraints: vi.fn(),
    getSettings: vi.fn(),
    clone: vi.fn(),
    contentHint: "",
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  } as unknown as MediaStreamTrack;
}

function mockStream(tracks: MediaStreamTrack[]): MediaStream {
  return {
    getTracks: () => tracks,
    getAudioTracks: () => tracks.filter((t) => t.kind === "audio"),
    getVideoTracks: () => tracks.filter((t) => t.kind === "video"),
    removeTrack: vi.fn(),
    addTrack: vi.fn(),
    active: true,
    id: "stream-1",
    onaddtrack: null,
    onremovetrack: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  } as unknown as MediaStream;
}

// Stub AudioContext / AudioWorklet so the service constructor path doesn't crash.
function createMockAudioContext() {
  return {
    audioWorklet: {
      addModule: vi.fn().mockResolvedValue(undefined)
    },
    createMediaStreamSource: vi.fn().mockReturnValue({
      connect: vi.fn()
    }),
    createGain: vi.fn().mockReturnValue({
      connect: vi.fn(),
      gain: { value: 0 }
    }),
    destination: {},
    state: "running",
    close: vi.fn().mockResolvedValue(undefined),
    sampleRate: 48000
  };
}

function createMockAudioWorkletNode() {
  return {
    port: {
      onmessage: null,
      close: vi.fn()
    },
    connect: vi.fn(),
    disconnect: vi.fn()
  };
}

const FakeAudioContext = vi.fn().mockImplementation(createMockAudioContext);
const FakeAudioWorkletNode = vi.fn().mockImplementation(createMockAudioWorkletNode);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).AudioContext = FakeAudioContext;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).AudioContext = FakeAudioContext;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).AudioWorkletNode = FakeAudioWorkletNode;

function resetAudioApiMocks() {
  FakeAudioContext.mockImplementation(createMockAudioContext);
  FakeAudioWorkletNode.mockImplementation(createMockAudioWorkletNode);
}

// Stub window.desktopAPI before tests (jsdom doesn't have it).
function setDesktopApiPlatform(platform: NodeJS.Platform) {
  Object.defineProperty(window, "desktopAPI", {
    value: {
      getPlatform: () => Promise.resolve(platform),
      requestMediaAccess: vi.fn().mockResolvedValue(true)
    },
    configurable: true,
    writable: true
  });
}

// Ensure navigator.mediaDevices exists in jsdom.
function ensureMediaDevices() {
  if (!navigator.mediaDevices) {
    Object.defineProperty(navigator, "mediaDevices", {
      value: {},
      configurable: true,
      writable: true
    });
  }
}

function stubGetDisplayMedia(fn: (...args: unknown[]) => unknown) {
  ensureMediaDevices();
  Object.defineProperty(navigator.mediaDevices, "getDisplayMedia", {
    value: fn,
    configurable: true,
    writable: true
  });
}

function stubGetUserMedia(fn: (...args: unknown[]) => unknown) {
  ensureMediaDevices();
  Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
    value: fn,
    configurable: true,
    writable: true
  });
}

function stubEnumerateDevices(fn: (...args: unknown[]) => unknown) {
  ensureMediaDevices();
  Object.defineProperty(navigator.mediaDevices, "enumerateDevices", {
    value: fn,
    configurable: true,
    writable: true
  });
}

describe("AudioCaptureService — microphone permissions", () => {
  let service: AudioCaptureService;

  beforeEach(() => {
    vi.restoreAllMocks();
    resetAudioApiMocks();
    service = new AudioCaptureService();
    setDesktopApiPlatform("darwin");
  });

  it("asks the Electron main process for microphone access before getUserMedia", async () => {
    const audioTrack = mockTrack("audio");
    const stream = mockStream([audioTrack]);
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    stubGetUserMedia(getUserMedia);
    stubEnumerateDevices(
      vi.fn().mockResolvedValue([
        {
          deviceId: "built-in",
          kind: "audioinput",
          label: "MacBook Pro Microphone",
          groupId: "group-built-in",
          toJSON: () => ({})
        }
      ])
    );

    await service.start(
      {
        onChunk: vi.fn(),
        onLevel: vi.fn()
      },
      "microphone"
    );

    expect(window.desktopAPI?.requestMediaAccess).toHaveBeenCalledWith("microphone");
    expect(getUserMedia).toHaveBeenCalledWith({
      audio: {}
    });
  });

  it("shows a specific microphone permission error when macOS denies access", async () => {
    Object.defineProperty(window, "desktopAPI", {
      value: {
        getPlatform: () => Promise.resolve("darwin"),
        requestMediaAccess: vi.fn().mockResolvedValue(false)
      },
      configurable: true,
      writable: true
    });
    const getUserMedia = vi.fn();
    stubGetUserMedia(getUserMedia);

    await expect(
      service.start(
        {
          onChunk: vi.fn(),
          onLevel: vi.fn()
        },
        "microphone"
      )
    ).rejects.toThrow("Нет доступа к микрофону");

    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it("retries the default microphone when a saved input device aborts", async () => {
    const audioTrack = mockTrack("audio");
    const stream = mockStream([audioTrack]);
    const getUserMedia = vi
      .fn()
      .mockRejectedValueOnce(new DOMException("Device failed", "AbortError"))
      .mockResolvedValueOnce(stream);
    stubGetUserMedia(getUserMedia);
    stubEnumerateDevices(vi.fn().mockResolvedValue([]));

    await service.start(
      {
        onChunk: vi.fn(),
        onLevel: vi.fn()
      },
      "microphone",
      "stale-device-id"
    );

    expect(getUserMedia).toHaveBeenNthCalledWith(1, {
      audio: {
        deviceId: { ideal: "stale-device-id" }
      }
    });
    expect(getUserMedia).toHaveBeenNthCalledWith(2, {
      audio: true
    });
  });

  it("shows a specific error when only virtual inputs are available for microphone mode", async () => {
    const getUserMedia = vi.fn();
    stubGetUserMedia(getUserMedia);
    stubEnumerateDevices(
      vi.fn().mockResolvedValue([
        {
          deviceId: "blackhole",
          kind: "audioinput",
          label: "BlackHole 2ch (Virtual)",
          groupId: "group-blackhole",
          toJSON: () => ({})
        },
        {
          deviceId: "teams",
          kind: "audioinput",
          label: "Microsoft Teams Audio Device (Virtual)",
          groupId: "group-teams",
          toJSON: () => ({})
        }
      ])
    );

    await expect(
      service.start(
        {
          onChunk: vi.fn(),
          onLevel: vi.fn()
        },
        "microphone"
      )
    ).rejects.toThrow("Физический микрофон не найден");

    expect(getUserMedia).not.toHaveBeenCalled();
  });
});

describe("AudioCaptureService — captureSystemAudio (Windows)", () => {
  let service: AudioCaptureService;

  beforeEach(() => {
    vi.restoreAllMocks();
    service = new AudioCaptureService();
    setDesktopApiPlatform("win32");
  });

  it("uses getDisplayMedia on Windows (audio: 'loopback' handled by Electron)", async () => {
    const audioTrack = mockTrack("audio");
    const videoTrack = mockTrack("video");
    const stream = mockStream([audioTrack, videoTrack]);

    const getDisplayMedia = vi.fn().mockResolvedValue(stream);
    stubGetDisplayMedia(getDisplayMedia);

    await expect(service["captureSystemAudio"]()).resolves.toBeDefined();

    expect(getDisplayMedia).toHaveBeenCalledWith({ audio: true, video: true });
    expect(videoTrack.stop).toHaveBeenCalled();
  });
});

describe("AudioCaptureService — captureSystemAudio (macOS native)", () => {
  let service: AudioCaptureService;

  beforeEach(() => {
    vi.restoreAllMocks();
    service = new AudioCaptureService();
    setDesktopApiPlatform("darwin");
  });

  it("uses getDisplayMedia on macOS 13+ (native ScreenCaptureKit)", async () => {
    const audioTrack = mockTrack("audio");
    const videoTrack = mockTrack("video");
    const stream = mockStream([audioTrack, videoTrack]);

    const getDisplayMedia = vi.fn().mockResolvedValue(stream);
    stubGetDisplayMedia(getDisplayMedia);


    const result = await service["captureSystemAudio"]();
    expect(result).toBeDefined();
    expect(getDisplayMedia).toHaveBeenCalledWith({ audio: true, video: true });
    expect(videoTrack.stop).toHaveBeenCalled();
  });

  it("falls through to virtual-device capture when getDisplayMedia throws NotAllowedError", async () => {
    const getDisplayMedia = vi.fn().mockRejectedValue(
      Object.assign(new DOMException("Permission denied", "NotAllowedError"))
    );
    stubGetDisplayMedia(getDisplayMedia);

    const virtualDevice: MediaDeviceInfo = {
      deviceId: "bh-1",
      kind: "audioinput",
      label: "BlackHole 16ch",
      groupId: "group-1",
      toJSON: () => ({})
    };
    vi.mocked(detectVirtualAudioDevice).mockResolvedValue(virtualDevice);

    const audioTrack = mockTrack("audio");
    const stream = mockStream([audioTrack]);
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    stubGetUserMedia(getUserMedia);


    const result = await service["captureSystemAudio"]();
    expect(result).toBeDefined();
    expect(detectVirtualAudioDevice).toHaveBeenCalled();
    expect(getUserMedia).toHaveBeenCalledWith({
      audio: {
        deviceId: { exact: "bh-1" }
      }
    });
  });

  it("throws install-guidance error when no virtual device is found on macOS fallback", async () => {
    const getDisplayMedia = vi.fn().mockRejectedValue(
      Object.assign(new DOMException("Not found", "NotFoundError"))
    );
    stubGetDisplayMedia(getDisplayMedia);

    vi.mocked(detectVirtualAudioDevice).mockResolvedValue(null);


    await expect(service["captureSystemAudio"]()).rejects.toThrow(
      /Не найден виртуальный аудиоустройство/
    );
  });

  it("does NOT fall through on non-denial errors (propagates the error)", async () => {
    const getDisplayMedia = vi.fn().mockRejectedValue(
      new Error("Some other error")
    );
    stubGetDisplayMedia(getDisplayMedia);


    await expect(service["captureSystemAudio"]()).rejects.toThrow("Some other error");
  });

  it("empty audio tracks on macOS fall through to virtual-device capture", async () => {
    // getDisplayMedia succeeds but returns video-only stream (no audio tracks)
    const videoTrack = mockTrack("video");
    const stream = mockStream([videoTrack]);
    const getDisplayMedia = vi.fn().mockResolvedValue(stream);
    stubGetDisplayMedia(getDisplayMedia);

    const virtualDevice: MediaDeviceInfo = {
      deviceId: "bh-1",
      kind: "audioinput",
      label: "BlackHole 16ch",
      groupId: "group-1",
      toJSON: () => ({})
    };
    vi.mocked(detectVirtualAudioDevice).mockResolvedValue(virtualDevice);

    const audioTrack = mockTrack("audio");
    const virtualStream = mockStream([audioTrack]);
    const getUserMedia = vi.fn().mockResolvedValue(virtualStream);
    stubGetUserMedia(getUserMedia);


    const result = await service["captureSystemAudio"]();
    expect(result).toBeDefined();
    expect(detectVirtualAudioDevice).toHaveBeenCalled();
    expect(getUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        audio: {
          deviceId: { exact: "bh-1" }
        }
      })
    );
  });

  it("NotSupportedError on macOS falls through to virtual-device capture", async () => {
    const getDisplayMedia = vi.fn().mockRejectedValue(
      Object.assign(new DOMException("", "NotSupportedError"))
    );
    stubGetDisplayMedia(getDisplayMedia);

    const virtualDevice: MediaDeviceInfo = {
      deviceId: "bh-2",
      kind: "audioinput",
      label: "BlackHole 16ch",
      groupId: "group-2",
      toJSON: () => ({})
    };
    vi.mocked(detectVirtualAudioDevice).mockResolvedValue(virtualDevice);

    const audioTrack = mockTrack("audio");
    const stream = mockStream([audioTrack]);
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    stubGetUserMedia(getUserMedia);


    const result = await service["captureSystemAudio"]();
    expect(result).toBeDefined();
    expect(detectVirtualAudioDevice).toHaveBeenCalled();
  });

  it("AbortError on macOS falls through to virtual-device capture", async () => {
    const getDisplayMedia = vi.fn().mockRejectedValue(
      Object.assign(new DOMException("", "AbortError"))
    );
    stubGetDisplayMedia(getDisplayMedia);

    const virtualDevice: MediaDeviceInfo = {
      deviceId: "bh-3",
      kind: "audioinput",
      label: "BlackHole 16ch",
      groupId: "group-3",
      toJSON: () => ({})
    };
    vi.mocked(detectVirtualAudioDevice).mockResolvedValue(virtualDevice);

    const audioTrack = mockTrack("audio");
    const stream = mockStream([audioTrack]);
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    stubGetUserMedia(getUserMedia);


    const result = await service["captureSystemAudio"]();
    expect(result).toBeDefined();
    expect(detectVirtualAudioDevice).toHaveBeenCalled();
  });

  it("empty audio tracks on macOS with no virtual device throws install-guidance error", async () => {
    const videoTrack = mockTrack("video");
    const stream = mockStream([videoTrack]);
    const getDisplayMedia = vi.fn().mockResolvedValue(stream);
    stubGetDisplayMedia(getDisplayMedia);

    vi.mocked(detectVirtualAudioDevice).mockResolvedValue(null);


    await expect(service["captureSystemAudio"]()).rejects.toThrow(
      /Не найден виртуальный/
    );
  });
});

describe("AudioCaptureService — captureSystemAudio (Linux monitor sources)", () => {
  let service: AudioCaptureService;

  beforeEach(() => {
    vi.restoreAllMocks();
    service = new AudioCaptureService();
    setDesktopApiPlatform("linux");
  });

  it("Linux: captures system audio via PulseAudio monitor source", async () => {
    const monitorDevice: MediaDeviceInfo = {
      deviceId: "alsa_output.pci-0000_00_1f.3.analog-stereo.monitor",
      kind: "audioinput",
      label: "Monitor of Built-in Audio Analog Stereo",
      groupId: "group-monitor-1",
      toJSON: () => ({})
    };
    const micDevice: MediaDeviceInfo = {
      deviceId: "default-mic",
      kind: "audioinput",
      label: "Built-in Microphone",
      groupId: "group-mic-1",
      toJSON: () => ({})
    };

    const enumerateDevices = vi.fn().mockResolvedValue([monitorDevice, micDevice]);
    stubEnumerateDevices(enumerateDevices);

    const audioTrack = mockTrack("audio");
    const monitorStream = mockStream([audioTrack]);
    const getUserMedia = vi.fn().mockResolvedValue(monitorStream);
    stubGetUserMedia(getUserMedia);

    // Also stub getDisplayMedia to verify it is NOT called.
    const getDisplayMedia = vi.fn();
    stubGetDisplayMedia(getDisplayMedia);


    const result = await service["captureSystemAudio"]();
    expect(result).toBeDefined();

    // Should use getUserMedia with the monitor device, not getDisplayMedia.
    expect(getDisplayMedia).not.toHaveBeenCalled();
    expect(getUserMedia).toHaveBeenCalledWith({
      audio: {
        deviceId: { exact: monitorDevice.deviceId }
      }
    });
  });

  it("Linux: uses microphone fallback when no monitor source found", async () => {
    const micDevice: MediaDeviceInfo = {
      deviceId: "default-mic",
      kind: "audioinput",
      label: "Built-in Microphone",
      groupId: "group-mic-1",
      toJSON: () => ({})
    };

    const enumerateDevices = vi.fn().mockResolvedValue([micDevice]);
    stubEnumerateDevices(enumerateDevices);

    const audioTrack = mockTrack("audio");
    const micStream = mockStream([audioTrack]);
    const getUserMedia = vi.fn().mockResolvedValue(micStream);
    stubGetUserMedia(getUserMedia);


    const result = await service["captureSystemAudio"]();
    expect(result).toBeDefined();

    // Should fall back to default microphone (no deviceId constraint).
    expect(getUserMedia).toHaveBeenCalledWith({
      audio: true
    });
  });
});
