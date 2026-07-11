import { answerQuestionStream } from "./answer-question-stream";
import { useTranscriptStore } from "@/features/transcript/store/transcript-store";

/**
 * Handler for the full-context-answer global hotkey (Ctrl+Shift+Enter).
 * Sends the entire accumulated transcript as context for the most recent question.
 * If no question exists, calls `onNoQuestion` (e.g. to show a toast).
 */
export async function handleFullContextAnswer(
  onNoQuestion: () => void
): Promise<void> {
  const store = useTranscriptStore.getState();
  const question = store.answeredQuestions[0];
  if (!question) {
    onNoQuestion();
    return;
  }
  const context = store.currentText;
  store.beginAnswerStreaming();
  try {
    const answer = await answerQuestionStream(
      question,
      context,
      false,
      () => {}, // snapshots are not needed for hotkey-triggered streams
      undefined,
      false // do NOT truncate context
    );
    store.recordAnswer(question, answer);
  } catch {
    // API errors are silently swallowed — the user will notice the missing answer.
  } finally {
    store.endAnswerStreaming();
  }
}
