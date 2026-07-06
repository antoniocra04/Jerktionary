import { calculateRmsLevel, convertFloat32ToPcm16LE } from "./pcm-converter";
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
    if (platform && platform !== "win32") {
      throw new Error("Захват системного звука сейчас поддерживается только на Windows");
    }

    if (!navigator.mediaDevices.getDisplayMedia) {
      throw new Error("Browser API для захвата системного звука недоступен");
    }

    const stream = await navigator.mediaDevices.getDisplayMedia({
      audio: true,
      video: true
    });

    for (const track of stream.getVideoTracks()) {
      track.stop();
      stream.removeTrack(track);
    }

    if (stream.getAudioTracks().length === 0) {
      throw new Error("Не удалось получить системный звук");
    }

    return stream;
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
