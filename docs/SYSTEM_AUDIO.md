# System Audio Capture — Platform Audit

## Platform Support Matrix

| Platform | Capture Method | Needs extra software? | Status |
|----------|---------------|-----------------------|--------|
| **Windows** | Electron `desktopCapturer` with `audio: "loopback"` (WASAPI loopback) | No — built into Windows | ✅ Working |
| **macOS 13+ (Ventura+)** | Native `getDisplayMedia` → ScreenCaptureKit | No — built into macOS | ✅ Working |
| **macOS ≤12 (Monterey and earlier)** | Falls back to virtual audio device (BlackHole, Soundflower, Loopback) | **Yes — impossible without a driver** | ⚠️ No native API exists |
| **Linux** | PulseAudio `*.monitor` sources / PipeWire monitor nodes via `getUserMedia` | No — built into PulseAudio/PipeWire | ✅ Working (TASK-012) |

## Capture Methods — Deep Dive

### Windows

Electron's `desktopCapturer` API supports `audio: "loopback"` constraint, which
uses the Windows Audio Session API (WASAPI) loopback mode. This captures all
system audio output without any third-party software.

- API: `navigator.mediaDevices.getDisplayMedia({ audio: true, video: true })`
- Electron handler injects `audio: "loopback"` automatically.
- No user configuration required.

### macOS 13+ (Ventura / Sonoma / Sequoia / Tahoe)

Apple's ScreenCaptureKit (introduced in macOS 13 Ventura, 2022) provides
native system audio capture. The browser's `getDisplayMedia` with
`audio: true` triggers the system screen-capture picker, which includes
system audio.

- API: `navigator.mediaDevices.getDisplayMedia({ audio: true, video: true })`
- User must allow screen capture in the native macOS dialog.
- No third-party software required.

### macOS ≤12 (Monterey and earlier)

**There is no native system-audio-capture API on macOS 12 or earlier.**
Apple provided zero public APIs for capturing system audio before
ScreenCaptureKit. The only option is a kernel-level virtual audio driver
that creates a loopback device:

- **BlackHole** (recommended): https://existential.audio/blackhole
- **Soundflower**: https://github.com/mattingalls/Soundflower
- **Loopback** (paid): https://rogueamoeba.com/loopback

The app detects these devices via `enumerateDevices()` and captures from
them using `getUserMedia({ audio: { deviceId: { exact: ... } } })`.

If no virtual device is installed, the app shows a clear error message:
"macOS 12 and earlier require a virtual audio driver for system audio
capture" with links to install BlackHole.

### Linux

Linux has built-in system audio capture via **PulseAudio monitor sources**
and **PipeWire monitor nodes**. Every modern Linux desktop (Ubuntu, Fedora,
Arch, etc.) ships with PulseAudio or PipeWire, which exposes the system
audio output as a virtual `audioinput` device.

These monitor sources appear in `enumerateDevices()` as audio input devices
with a `.monitor` suffix in their `deviceId` or `label`. PipeWire fully
emulates the PulseAudio convention, so no separate detection is needed.

- API: `navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: monitorId } } })`
- No `getDisplayMedia` needed (monitor sources are regular audio input devices).
- If no monitor source is found (uncommon), the app falls back to microphone input.

#### PulseAudio Example

```
Device: alsa_output.pci-0000_00_1f.3.analog-stereo.monitor
Kind: audioinput
Label: "Monitor of Built-in Audio Analog Stereo"
```

This device captures everything playing through the default audio output.

#### PipeWire Example

PipeWire advertises monitor nodes the same way:
```
Device: alsa_output.pci-0000_00_1f.3.analog-stereo.monitor
Kind: audioinput
```

Same convention used by OBS Studio, Audacity, and every other Linux audio
application.

### Fallback Behavior

| Platform | When primary method fails |
|----------|--------------------------|
| Windows | Not applicable (WASAPI loopback is reliable) |
| macOS 13+ | Falls through to virtual device detection |
| macOS ≤12 | Already on fallback path; error with guidance if no virtual device |
| Linux | Falls back to default microphone input if no monitor source found |

## Out of Scope

- ChromeOS system audio capture (no known API).
- Android/iOS system audio capture (mobile platforms not supported).
- macOS ≤12 system audio without a virtual driver (impossible — no API exists).
