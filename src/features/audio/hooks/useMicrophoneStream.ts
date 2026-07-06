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
      const message = mapMicrophoneError(error);
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

function mapMicrophoneError(error: unknown): string {
  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return "Доступ к микрофону запрещён пользователем";
  }

  if (error instanceof DOMException && error.name === "NotFoundError") {
    return "Микрофон не найден";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Не удалось запустить микрофон";
}
