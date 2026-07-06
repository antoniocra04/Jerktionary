import { useCallback, useRef } from "react";
import { getAsrWsHello, getBackendWsUrl } from "@/features/settings/store/settings-store";
import type { BackendWsEvent } from "@/shared/types/transcript";
import { mergeTerms } from "@/features/transcript/services/transcript-merger";
import { TranscriptWsClient } from "@/features/transcript/services/transcript-ws-client";
import { useTranscriptStore } from "@/features/transcript/store/transcript-store";

export function useTranscriptSocket() {
  const clientRef = useRef<TranscriptWsClient | null>(null);

  const handleEvent = useCallback((event: BackendWsEvent) => {
    const store = useTranscriptStore.getState();
    store.pushEvent({ ...event, receivedAt: Date.now() });

    if (event.type === "transcript_update") {
      store.setTranscript(event.text, event.terms);
      return;
    }

    if (event.type === "terms_update") {
      store.setTerms(mergeTerms(store.terms, event.items));
      return;
    }

    if (event.type === "error") {
      const messages: Record<string, string> = {
        INVALID_AUDIO_CHUNK: "Backend отклонил audio chunk: ожидается binary PCM 16 kHz mono int16",
        ASR_UNAVAILABLE:
          "Локальный Whisper выключен на backend. Выберите API-провайдера распознавания в настройках.",
        ASR_API_ERROR:
          "API-провайдер распознавания отклонил запрос: проверьте ключ и модель в настройках.",
        INVALID_CONFIG: "Backend не принял конфигурацию распознавания."
      };
      store.setWebsocketError(messages[event.code] ?? `Backend WebSocket error: ${event.code}`);
    }
  }, []);

  const connect = useCallback(() => {
    clientRef.current?.disconnect();
    const client = new TranscriptWsClient({
      url: getBackendWsUrl(),
      onEvent: handleEvent,
      onStatus: useTranscriptStore.getState().setConnectionStatus,
      onError: useTranscriptStore.getState().setWebsocketError,
      buildHelloMessage: getAsrWsHello,
      reconnect: true
    });
    clientRef.current = client;
    client.connect();
  }, [handleEvent]);

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
    clientRef.current = null;
  }, []);

  const sendAudioChunk = useCallback((chunk: ArrayBuffer) => {
    return clientRef.current?.sendAudioChunk(chunk) ?? false;
  }, []);

  return {
    connect,
    disconnect,
    sendAudioChunk
  };
}
