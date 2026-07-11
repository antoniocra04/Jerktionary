import { HttpError } from "@/shared/api/http-client";
import { getBackendHttpUrl, useSettingsStore } from "@/features/settings/store/settings-store";
import { useTranscriptStore } from "@/features/transcript/store/transcript-store";
import type { LiveAnswer } from "@/shared/types/answer";

type AnswerSnapshotDto = {
  answer?: string;
  points?: string;
  example?: string;
  done?: boolean;
  error?: string;
};

function parsePoints(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.replace(/^\s*[-•*]\s*/, "").trim())
    .filter((line) => line.length > 0);
}

/**
 * Streams a spoken-style answer to a question, invoking `onSnapshot` with each
 * progressively more complete answer. Resolves with the final answer.
 *
 * @param truncateContext — when `true` (default), only the tail 2000 chars of
 *   the context are sent so auto-detected questions stay cheap. Set to `false`
 *   for explicit full-context requests (hotkey).
 */
export async function answerQuestionStream(
  question: string,
  context: string,
  deep: boolean,
  onSnapshot: (answer: LiveAnswer, done: boolean) => void,
  signal?: AbortSignal,
  truncateContext = true
): Promise<LiveAnswer> {
  let response: Response;
  try {
    response = await fetch(`${getBackendHttpUrl()}/api/answer/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify({
        question,
        // The transcript grows from the start: the relevant conversation is the tail.
        context: truncateContext ? context.slice(-2000) : context,
        deep,
        profile: useSettingsStore.getState().aboutMe.slice(0, 1000),
        meeting_context: useTranscriptStore.getState().meetingContext.slice(0, 2000)
      }),
      signal
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new HttpError("Backend недоступен или CORS не разрешает dev origin.", 0);
  }

  if (!response.ok || !response.body) {
    throw new HttpError(`HTTP ${response.status}`, response.status);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let latest: LiveAnswer | null = null;

  const handleEvent = (raw: string): void => {
    const line = raw.trim();
    if (!line.startsWith("data:")) {
      return;
    }
    const payload = JSON.parse(line.slice(5).trim()) as AnswerSnapshotDto;
    if (payload.error) {
      throw new HttpError("Модель вернула ошибку", 502, payload.error);
    }
    const answer: LiveAnswer = {
      answer: payload.answer ?? "",
      points: parsePoints(payload.points ?? ""),
      example: payload.example ?? ""
    };
    latest = answer;
    onSnapshot(answer, Boolean(payload.done));
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const event of events) {
      handleEvent(event);
    }
  }
  if (buffer.trim()) {
    handleEvent(buffer);
  }

  if (latest === null) {
    throw new HttpError("Пустой поток ответа", 502);
  }
  return latest;
}
