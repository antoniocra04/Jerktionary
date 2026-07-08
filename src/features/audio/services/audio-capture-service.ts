import { calculateRmsLevel, convertFloat32ToPcm16LE } from "./pcm-converter";
import { detectVirtualAudioDevice, KNOWN_VIRTUAL_DEVICES } from "./mac-audio-utils";
import type { AudioSource } from "@/features/settings/store/settings-store";

export type AudioCaptureCallbacks = {
  onChunk: (chunk: ArrayBuffer) => void;
  onLevel: (level: number) => void;
};

export class AudioCaptureService {
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private monitorGain: GainNode | null = null;

  async start(
    callbacks: AudioCaptureCallbacks,
    source: AudioSource,
    inputDeviceId = ""
  ): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Браузерный API микрофона недоступен");
    }

    const AudioContextCtor = window.AudioContext;
    if (!AudioContextCtor) {
      throw new Error("AudioContext не поддерживается");
    }

    this.stream =
      source === "system"
        ? await this.captureSystemAudio()
        : await this.captureMicrophone(inputDeviceId);

    this.context = new AudioContextCtor();
    await this.context.audioWorklet.addModule(
      new URL("./audio-worklet-processor.ts", import.meta.url)
    );

    this.sourceNode = this.context.createMediaStreamSource(this.stream);
    this.workletNode = new AudioWorkletNode(this.context, "jerktionary-audio-processor", {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1]
    });
    this.monitorGain = this.context.createGain();
    this.monitorGain.gain.value = 0;

    this.workletNode.port.onmessage = (event: MessageEvent<Float32Array>) => {
      const samples = event.data;
      callbacks.onLevel(calculateRmsLevel(samples));
      callbacks.onChunk(convertFloat32ToPcm16LE(samples, this.context?.sampleRate ?? 48_000));
    };

    this.sourceNode.connect(this.workletNode);
    this.workletNode.connect(this.monitorGain);
    this.monitorGain.connect(this.context.destination);
  }

  private async captureMicrophone(inputDeviceId: string): Promise<MediaStream> {
    return navigator.mediaDevices.getUserMedia({
      audio: {
        // "ideal" (not "exact") so a stale saved deviceId (unplugged mic) falls
        // back to the system default instead of failing the whole capture.
        ...(inputDeviceId ? { deviceId: { ideal: inputDeviceId } } : {}),
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
  }

  private async captureSystemAudio(): Promise<MediaStream> {
    const platform = await window.desktopAPI?.getPlatform();

    // Linux: use PulseAudio/PipeWire monitor sources via getUserMedia.
    // Monitor sources are regular audioinput devices (no getDisplayMedia needed).
    if (platform === "linux") {
      return this.captureSystemAudioOnLinux();
    }

    if (!navigator.mediaDevices.getDisplayMedia) {
      throw new Error("Browser API для захвата системного звука недоступен");
    }

    // Primary path: getDisplayMedia (Windows + macOS only; Linux handled above).
    //   Windows  → Electron's custom handler injects `audio: "loopback"`.
    //   macOS 13+ → no handler → Electron defaults to ScreenCaptureKit, which
    //                includes system audio in the native OS picker.
    //   macOS <13 → the dialog may appear but audio is not included; we fall
    //                through to virtual-device capture on error.
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        audio: true,
        video: true
      });

      for (const track of stream.getVideoTracks()) {
        track.stop();
        stream.removeTrack(track);
      }

      if (stream.getAudioTracks().length === 0) {
        for (const track of stream.getTracks()) track.stop();
        throw new Error("Не удалось получить системный звук");
      }

      return stream;
    } catch (err) {
      if (shouldFallbackToVirtualDevice(err, platform)) {
        return this.captureViaVirtualAudioDevice();
      }
      throw err;
    }
  }

  private async captureSystemAudioOnLinux(): Promise<MediaStream> {
    if (!navigator.mediaDevices?.enumerateDevices) {
      throw new Error("Перечисление аудиоустройств недоступно");
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Браузерный API микрофона недоступен");
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter((d) => d.kind === "audioinput");

    // PulseAudio monitor sources have ".monitor" suffix in deviceId/label.
    // PipeWire emulates the same convention, so no separate detection needed.
    const monitorSource = audioInputs.find(
      (d) =>
        d.deviceId.includes(".monitor") ||
        d.label.toLowerCase().includes("monitor")
    );

    if (monitorSource) {
      return navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: monitorSource.deviceId },
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
    }

    // No monitor source found — fall back to default microphone input.
    return navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
  }

  private async captureViaVirtualAudioDevice(): Promise<MediaStream> {
    const device = await detectVirtualAudioDevice();
    if (!device) {
      const names = KNOWN_VIRTUAL_DEVICES.join(", ");
      throw new Error(
        `macOS 12 and earlier require a virtual audio driver for system audio capture. ` +
          `Не найден виртуальный аудиоустройство (${names}). ` +
          `Установите один из них (рекомендуется BlackHole): ` +
          `BlackHole — https://existential.audio/blackhole, ` +
          `Soundflower — https://github.com/mattingalls/Soundflower, ` +
          `Loopback — https://rogueamoeba.com/loopback`
      );
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Браузерный API микрофона недоступен");
    }

    return navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: { exact: device.deviceId },
        channelCount: 1,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    });
  }

  async stop(): Promise<void> {
    this.workletNode?.port.close();
    this.workletNode?.disconnect();
    this.sourceNode?.disconnect();
    this.monitorGain?.disconnect();

    for (const track of this.stream?.getTracks() ?? []) {
      track.stop();
    }

    if (this.context && this.context.state !== "closed") {
      await this.context.close();
    }

    this.stream = null;
    this.context = null;
    this.workletNode = null;
    this.sourceNode = null;
    this.monitorGain = null;
  }
}

/**
 * Returns `true` when the error on macOS indicates native system-audio
 * capture is unavailable and the next-best option is falling through to
 * virtual-device capture instead of surfacing the error to the user.
 *
 * Matched cases (all gated on `platform === "darwin"`):
 *   - DOMException with name NotAllowedError, NotFoundError, NotSupportedError, or AbortError
 *   - The empty-audio-tracks Error thrown when getDisplayMedia succeeds
 *     but returns zero audio tracks
 */
function shouldFallbackToVirtualDevice(
  err: unknown,
  platform: NodeJS.Platform | undefined
): boolean {
  if (platform !== "darwin") {
    return false;
  }

  if (err instanceof DOMException) {
    return (
      err.name === "NotAllowedError" ||
      err.name === "NotFoundError" ||
      err.name === "NotSupportedError" ||
      err.name === "AbortError"
    );
  }

  if (err instanceof Error) {
    return err.message === "Не удалось получить системный звук";
  }

  return false;
}
