import { useCallback } from "react";
import { useMicrophoneStream } from "./useMicrophoneStream";
import { buildMeetingRecord, saveMeeting } from "@/features/meetings/services/meetings-service";
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

    // Archive the finished meeting (transcript + Q&A + meeting context) so it can
    // be reviewed and exported later. Failures must not break stopping.
    const record = buildMeetingRecord();
    if (record) {
      void saveMeeting(record).catch(() => undefined);
    }
  }, [microphone, socket]);

  return {
    startListening,
    stopListening
  };
}
