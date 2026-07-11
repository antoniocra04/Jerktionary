import { answerQuestionStream } from "./answer-question-stream";
import { useTranscriptStore } from "@/features/transcript/store/transcript-store";
import { extractForcedQuestion } from "@/features/live-answer/hooks/useLiveQuestion";

export async function handleFullContextAnswer(): Promise<void> {
  const store = useTranscriptStore.getState();
  const context = store.currentText;
  if (!context) return;

  const question = extractForcedQuestion(context);
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
