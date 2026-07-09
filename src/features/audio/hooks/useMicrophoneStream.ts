import { useCallback, useRef } from "react";
import { AudioCaptureService } from "@/features/audio/services/audio-capture-service";
import { useSettingsStore } from "@/features/settings/store/settings-store";
import { useTranscriptStore } from "@/features/transcript/store/transcript-store";

export function useMicrophoneStream(onChunk: (chunk: ArrayBuffer) => void) {
  const serviceRef = useRef<AudioCaptureService | null>(null);

  const startMicrophone = useCallback(async () => {
    const store = useTranscriptStore.getState();
    store.setMicrophoneError(null);
    serviceRef.current = new AudioCaptureService();
    const { audioSource, audioInputDeviceId } = useSettingsStore.getState();

    try {
      await serviceRef.current.start(
        {
          onChunk,
          onLevel: store.setMicrophoneLevel
        },
        audioSource,
        audioInputDeviceId
      );
    } catch (error) {
      serviceRef.current = null;
      const message = await mapMicrophoneError(error, audioSource, audioInputDeviceId);
      store.setMicrophoneError(message);
      throw new Error(message);
    }
  }, [onChunk]);

  const stopMicrophone = useCallback(async () => {
    await serviceRef.current?.stop();
    serviceRef.current = null;
    useTranscriptStore.getState().setMicrophoneLevel(0);
  }, []);

  return {
    startMicrophone,
    stopMicrophone
  };
}

async function mapMicrophoneError(
  error: unknown,
  source: string,
  inputDeviceId: string
): Promise<string> {
  if (error instanceof Error && error.message.includes("Audio diagnostics:")) {
    return error.message;
  }

  const diagnostics = await buildAudioDiagnostics(source, inputDeviceId);

  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return `Доступ к микрофону запрещён пользователем. ${diagnostics}`;
  }

  if (error instanceof DOMException && error.name === "NotFoundError") {
    return `Микрофон не найден. ${diagnostics}`;
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return `Не удалось открыть аудиоустройство (${error.name}: ${error.message || "без сообщения"}). Закройте другие приложения, которые используют микрофон, переподключите устройство или выберите «Микрофон по умолчанию» в настройках. ${diagnostics}`;
  }

  if (error instanceof Error) {
    return `${error.message}. ${diagnostics}`;
  }

  return `Не удалось запустить микрофон. ${diagnostics}`;
}

async function buildAudioDiagnostics(source: string, inputDeviceId: string): Promise<string> {
  const platform = await window.desktopAPI?.getPlatform().catch(() => undefined);
  let devices = "unknown";

  try {
    const all = await navigator.mediaDevices?.enumerateDevices?.();
    const audioInputs = (all ?? []).filter((device) => device.kind === "audioinput");
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
