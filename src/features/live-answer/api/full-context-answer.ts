import { useTranscriptStore } from "@/features/transcript/store/transcript-store";

function lastSentence(text: string): string | null {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (sentences.length === 0) return null;
  return sentences[sentences.length - 1].replace(/[.…!?]+$/, "") || null;
}

export async function handleFullContextAnswer(): Promise<void> {
  const store = useTranscriptStore.getState();
  const context = store.currentText;
  if (!context) return;

  const question = lastSentence(context);
  if (!question) return;

  // Push the question so AnswerCard renders with a loading indicator.
  // The full-context flag tells useLiveAnswer to send the entire transcript
  // instead of the default slice(-2000).
  store.setFullContext();
  store.pushQuestion(question);
}
