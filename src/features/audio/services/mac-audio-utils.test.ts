import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  detectVirtualAudioDevice,
  getDeviceInstallUrl,
  hasMultiOutputDevice,
  KNOWN_VIRTUAL_DEVICES,
  MULTI_OUTPUT_HELP_URL
} from "./mac-audio-utils";

// Stub navigate.mediaDevices.enumerateDevices — jsdom may not allow
// spying on built-in methods, so we replace it.
function stubEnumerateDevices(devices: MediaDeviceInfo[]) {
  Object.defineProperty(navigator, "mediaDevices", {
    value: {
      ...navigator.mediaDevices,
      enumerateDevices: vi.fn().mockResolvedValue(devices)
    },
    configurable: true,
    writable: true
  });
}

function clearMediaDevices() {
  Object.defineProperty(navigator, "mediaDevices", {
    value: undefined,
    configurable: true,
    writable: true
  });
}

describe("detectVirtualAudioDevice", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the first device whose label matches a known virtual device (case-insensitive)", async () => {
    const blackhole: MediaDeviceInfo = {
      deviceId: "bh-1",
      kind: "audioinput",
      label: "BlackHole 16ch",
      groupId: "group-1",
      toJSON: () => ({})
    };
    stubEnumerateDevices([
      { deviceId: "m1", kind: "audioinput", label: "Built-in Mic", groupId: "g1", toJSON: () => ({}) },
      blackhole
    ]);

    const result = await detectVirtualAudioDevice();
    expect(result?.deviceId).toBe("bh-1");
  });

  it("matches against groupId as well", async () => {
    const sf: MediaDeviceInfo = {
      deviceId: "sf-1",
      kind: "audioinput",
      label: "Aggregate Device",
      groupId: "soundflower-2ch",
      toJSON: () => ({})
    };
    stubEnumerateDevices([
      { deviceId: "m1", kind: "audioinput", label: "Built-in Mic", groupId: "g1", toJSON: () => ({}) },
      sf
    ]);

    const result = await detectVirtualAudioDevice();
    expect(result?.deviceId).toBe("sf-1");
  });

  it("returns null when no virtual device is found", async () => {
    stubEnumerateDevices([
      { deviceId: "m1", kind: "audioinput", label: "Built-in Mic", groupId: "g1", toJSON: () => ({}) }
    ]);

    const result = await detectVirtualAudioDevice();
    expect(result).toBeNull();
  });

  it("returns null when enumerateDevices is unavailable", async () => {
    clearMediaDevices();
    const result = await detectVirtualAudioDevice();
    expect(result).toBeNull();
  });

  it("detects all known virtual device brands", async () => {
    for (const name of KNOWN_VIRTUAL_DEVICES) {
      const device: MediaDeviceInfo = {
        deviceId: `vd-${name}`,
        kind: "audioinput",
        label: `${name} 2ch`,
        groupId: "group-1",
        toJSON: () => ({})
      };
      stubEnumerateDevices([device]);

      const result = await detectVirtualAudioDevice();
      expect(result?.deviceId).toBe(`vd-${name}`);
    }
  });
});

describe("hasMultiOutputDevice", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns true when an audiooutput contains 'multi-output'", async () => {
    stubEnumerateDevices([
      { deviceId: "o1", kind: "audiooutput", label: "Multi-Output Device", groupId: "g1", toJSON: () => ({}) }
    ]);
    // Stub desktopAPI with darwin platform
    Object.defineProperty(window, "desktopAPI", {
      value: {
        getPlatform: () => Promise.resolve("darwin" as NodeJS.Platform)
      },
      configurable: true,
      writable: true
    });

    const result = await hasMultiOutputDevice();
    expect(result).toBe(true);
  });

  it("returns false on non-macOS platforms", async () => {
    stubEnumerateDevices([
      { deviceId: "o1", kind: "audiooutput", label: "Multi-Output Device", groupId: "g1", toJSON: () => ({}) }
    ]);
    Object.defineProperty(window, "desktopAPI", {
      value: {
        getPlatform: () => Promise.resolve("win32" as NodeJS.Platform)
      },
      configurable: true,
      writable: true
    });

    const result = await hasMultiOutputDevice();
    expect(result).toBe(false);
  });
});

describe("getDeviceInstallUrl", () => {
  it("returns the URL for known devices", () => {
    expect(getDeviceInstallUrl("BlackHole")).toBe("https://existential.audio/blackhole");
    expect(getDeviceInstallUrl("Soundflower")).toBe("https://github.com/mattingalls/Soundflower");
    expect(getDeviceInstallUrl("Loopback")).toBe("https://rogueamoeba.com/loopback");
  });

  it("returns empty string for unknown devices", () => {
    expect(getDeviceInstallUrl("Unknown")).toBe("");
  });
});

describe("KNOWN_VIRTUAL_DEVICES", () => {
  it("contains the expected three devices", () => {
    expect(KNOWN_VIRTUAL_DEVICES).toEqual(["BlackHole", "Soundflower", "Loopback"]);
  });
});

describe("MULTI_OUTPUT_HELP_URL", () => {
  it("is the Apple support article URL", () => {
    expect(MULTI_OUTPUT_HELP_URL).toContain("support.apple.com");
    expect(MULTI_OUTPUT_HELP_URL).toContain("multi-output-device");
  });
});
