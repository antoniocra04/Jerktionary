/**
 * macOS virtual-audio-device detection helpers.
 *
 * When macOS < 13 (no ScreenCaptureKit), we fall back to capturing from
 * a virtual audio loopback device such as BlackHole, Soundflower, or
 * Loopback. This module detects those devices and checks whether a
 * Multi-Output Device exists in Audio MIDI Setup.
 */

export const KNOWN_VIRTUAL_DEVICES: string[] = ["BlackHole", "Soundflower", "Loopback"];

/**
 * Looks through all `audioinput` devices and returns the first one whose
 * `label` or `groupId` (case-insensitive) contains one of the known
 * virtual-device names.
 */
export async function detectVirtualAudioDevice(): Promise<MediaDeviceInfo | null> {
  if (!navigator.mediaDevices?.enumerateDevices) {
    return null;
  }

  const devices = await navigator.mediaDevices.enumerateDevices();
  const inputs = devices.filter((d) => d.kind === "audioinput");

  for (const device of inputs) {
    const haystack = `${device.label}\n${device.groupId}`.toLowerCase();
    if (KNOWN_VIRTUAL_DEVICES.some((name) => haystack.includes(name.toLowerCase()))) {
      return device;
    }
  }

  return null;
}

/**
 * On macOS, checks whether any audio output device label contains
 * "Multi-Output" — the naming convention used by Audio MIDI Setup.
 * Returns `false` on non-macOS (no-op).
 */
export async function hasMultiOutputDevice(): Promise<boolean> {
  if (!navigator.mediaDevices?.enumerateDevices) {
    return false;
  }

  const platform = await window.desktopAPI?.getPlatform();
  if (platform !== "darwin") {
    return false;
  }

  const devices = await navigator.mediaDevices.enumerateDevices();
  const outputs = devices.filter((d) => d.kind === "audiooutput");
  return outputs.some((d) => d.label.toLowerCase().includes("multi-output"));
}
