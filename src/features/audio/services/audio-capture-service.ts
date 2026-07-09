import { calculateRmsLevel, convertFloat32ToPcm16LE } from "./pcm-converter";
import { detectVirtualAudioDevice, KNOWN_VIRTUAL_DEVICES } from "./mac-audio-utils";
// "?worker&url" makes Vite compile the worklet as a standalone JS chunk and
// return its URL. A plain `new URL("./x.ts", import.meta.url)` gets inlined
// into the production bundle as a raw-TypeScript data: URL (MIME video/mp2t),
// which addModule rejects with "AbortError: The user aborted a request."
import workletUrl from "./audio-worklet-processor?worker&url";
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

    // In packaged Electron builds, macOS TCC grants are tied to the app bundle.
    // Ask through the main process before Chromium's getUserMedia path runs.
    if (source === "microphone") {
      await this.ensureMicrophoneAccess();
    }

    // For system audio on macOS, trigger native screen-recording permission
    // dialog (getDisplayMedia shows its own picker, but TCC must be granted first).
    if (source === "system") {
      await window.desktopAPI?.requestMediaAccess("screen");
    }

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        this.stream =
          source === "system"
            ? await this.captureSystemAudio()
            : await this.captureMicrophone(inputDeviceId);
        break;
      } catch (err) {
        if (
          attempt === 0 &&
          err instanceof DOMException &&
          err.name === "AbortError"
        ) {
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
        throw await this.withAudioDiagnostics(err, source, inputDeviceId);
      }
    }

    if (!this.stream) {
      throw new Error("Не удалось получить аудиопоток");
    }

    try {
      this.context = new AudioContextCtor();
      await this.context.audioWorklet.addModule(workletUrl);

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
    } catch (err) {
      await this.stop();
      throw await this.withAudioDiagnostics(err, source, inputDeviceId);
    }
  }

  private async captureMicrophone(inputDeviceId: string): Promise<MediaStream> {
    const effectiveDeviceId = await this.resolveMicrophoneInputDeviceId(inputDeviceId);

    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: this.microphoneConstraints(effectiveDeviceId)
      });
    } catch (err) {
      if (effectiveDeviceId && shouldRetryWithDefaultMicrophone(err)) {
        return navigator.mediaDevices.getUserMedia({
          audio: true
        });
      }
      throw err;
    }
  }

  private async ensureMicrophoneAccess(): Promise<void> {
    const allowed = await window.desktopAPI?.requestMediaAccess("microphone");
    if (allowed === false) {
      throw new Error(
        "Нет доступа к микрофону. Проверьте System Settings → Privacy & Security → Microphone для Jerktionary и перезапустите приложение."
      );
    }
  }

  private microphoneConstraints(inputDeviceId: string): MediaTrackConstraints {
    return {
      // "ideal" (not "exact") so a stale saved deviceId (unplugged mic) can
      // fall back to the system default. Some macOS/Electron builds still abort
      // while opening a stale preferred device, so captureMicrophone retries once
      // with `audio: true` too.
      ...(inputDeviceId ? { deviceId: { ideal: inputDeviceId } } : {})
    };
  }

  private async resolveMicrophoneInputDeviceId(inputDeviceId: string): Promise<string> {
    const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
    const audioInputs = devices.filter((device) => device.kind === "audioinput");
    if (audioInputs.length === 0) {
      return inputDeviceId;
    }

    const realInputs = audioInputs.filter((device) => !isVirtualAudioInput(device));
    const selectedInput = inputDeviceId
      ? audioInputs.find((device) => device.deviceId === inputDeviceId)
      : null;

    if (selectedInput && !isVirtualAudioInput(selectedInput)) {
      return inputDeviceId;
    }

    if (realInputs.length > 0) {
      return realInputs[0].deviceId;
    }

    const labels = audioInputs
      .map((device, index) => device.label || `audioinput-${index + 1}`)
      .join(", ");

    throw new Error(
      `Физический микрофон не найден. macOS показывает только виртуальные аудиоустройства: ${labels}. ` +
        `Для микрофона выберите реальный Input в System Settings → Sound → Input. ` +
        `Для системного звука выберите «Система» в настройках Jerktionary.`
    );
  }

  private async withAudioDiagnostics(
    err: unknown,
    source: AudioSource,
    inputDeviceId: string
  ): Promise<unknown> {
    if (!(err instanceof DOMException) && !(err instanceof Error)) {
      return err;
    }

    const details = await this.buildAudioDiagnostics(source, inputDeviceId);
    const name = err instanceof DOMException ? err.name : err.name || "Error";
    const message = err.message || "unknown";

    return new Error(`${name}: ${message}. ${details}`);
  }

  private async buildAudioDiagnostics(source: AudioSource, inputDeviceId: string): Promise<string> {
    const platform = await window.desktopAPI?.getPlatform().catch(() => undefined);
    let devices = "unknown";
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = all.filter((device) => device.kind === "audioinput");
      devices =
        audioInputs.length === 0
          ? "none"
          : audioInputs
              .map((device, index) => {
                const label = device.label || `audioinput-${index + 1}`;
                const selected = inputDeviceId && device.deviceId === inputDeviceId ? "*" : "";
                return `${selected}${label}`;
              })
              .join(", ");
    } catch {
      devices = "enumerate-failed";
    }

    return `Audio diagnostics: platform=${platform ?? "unknown"}, source=${source}, savedDevice=${inputDeviceId ? "yes" : "no"}, devices=${devices}`;
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
    //   Windows → Electron's custom handler injects `audio: "loopback"`.
    //   macOS   → no display-media handler is registered, so getDisplayMedia
    //             rejects (NotSupportedError on Electron 31) and we fall
    //             through to virtual-device (BlackHole) capture below.
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
          deviceId: { exact: monitorSource.deviceId }
        }
      });
    }

    // No monitor source found — fall back to default microphone input.
    return navigator.mediaDevices.getUserMedia({
      audio: true
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
        deviceId: { exact: device.deviceId }
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

function shouldRetryWithDefaultMicrophone(err: unknown): boolean {
  return (
    err instanceof DOMException &&
    (err.name === "AbortError" ||
      err.name === "NotFoundError" ||
      err.name === "OverconstrainedError")
  );
}

function isVirtualAudioInput(device: MediaDeviceInfo): boolean {
  const label = `${device.label}\n${device.groupId}`.toLowerCase();
  return (
    label.includes("virtual") ||
    KNOWN_VIRTUAL_DEVICES.some((name) => label.includes(name.toLowerCase()))
  );
}
