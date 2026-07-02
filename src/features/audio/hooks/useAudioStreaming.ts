import { useCallback } from "react";
import { useMicrophoneStream } from "./useMicrophoneStream";
import { useTranscriptSocket } from "@/features/transcript/hooks/useTranscriptSocket";
import { useTranscriptStore } from "@/features/transcript/store/transcript-store";

export function useAudioStreaming() {
  const socket = useTranscriptSocket();
  const microphone = useMicrophoneStream(socket.sendAudioChunk);

  const startListening = useCallback(async () => {
    const store = useTranscriptStore.getState();
    store.resetSession();
    store.setListening(true);
    socket.connect();

    try {
      await microphone.startMicrophone();
    } catch (error) {
      socket.disconnect();
      store.setListening(false);
      throw error;
    }
  }, [microphone, socket]);

  const stopListening = useCallback(async () => {
    const store = useTranscriptStore.getState();
    store.setListening(false);
    await microphone.stopMicrophone();
    socket.disconnect();
  }, [microphone, socket]);

  return {
    startListening,
    stopListening
  };
}
