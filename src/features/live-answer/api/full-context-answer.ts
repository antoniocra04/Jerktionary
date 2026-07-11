import { answerQuestionStream } from "./answer-question-stream";
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

  store.beginAnswerStreaming();
  try {
    const answer = await answerQuestionStream(
      question,
      context,
      false,
      () => {},
      undefined,
      false
    );
    store.recordAnswer(question, answer);
  } catch {
    // API errors are silently swallowed — the user will notice the missing answer.
  } finally {
    store.endAnswerStreaming();
  }
}
