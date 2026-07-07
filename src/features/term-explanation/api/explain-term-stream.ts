import { HttpError } from "@/shared/api/http-client";
import { getBackendHttpUrl } from "@/features/settings/store/settings-store";
import type { TermExplanation } from "@/shared/types/term";
import { termContext } from "@/shared/utils/context-slice";

type StreamSnapshotDto = {
  title?: string;
  short?: string;
  example?: string;
  why_important?: string;
  source?: "cache" | "local_llm" | "api_llm";
  done?: boolean;
  error?: string;
};

/**
 * POSTs to the streaming explain endpoint and invokes `onSnapshot` for every
 * progressively more complete snapshot (SSE `data:` lines). Resolves with the
 * final snapshot.
 */
export async function explainTermStream(
  term: string,
  context: string,
  onSnapshot: (explanation: TermExplanation, done: boolean) => void,
  signal?: AbortSignal
): Promise<TermExplanation> {
  let response: Response;
  try {
    response = await fetch(`${getBackendHttpUrl()}/api/terms/explain/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify({
        term,
        context: termContext(context, term, 2000)
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
  let latest: TermExplanation | null = null;

  const handleEvent = (raw: string): void => {
    const line = raw.trim();
    if (!line.startsWith("data:")) {
      return;
    }

    const payload = JSON.parse(line.slice(5).trim()) as StreamSnapshotDto;
    if (payload.error) {
      throw new HttpError("Модель вернула ошибку", 502, payload.error);
    }

    const explanation: TermExplanation = {
      title: payload.title ?? "",
      short: payload.short ?? "",
      example: payload.example ?? "",
      whyImportant: payload.why_important ?? "",
      source: payload.source ?? "local_llm"
    };
    latest = explanation;
    onSnapshot(explanation, Boolean(payload.done));
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
    throw new HttpError("Пустой поток объяснения", 502);
  }
  return latest;
}
