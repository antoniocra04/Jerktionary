import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import type { TermExplanation } from "@/shared/types/term";
import { explainTermStream } from "@/features/term-explanation/api/explain-term-stream";

export type LiveExplanationState = {
  data?: TermExplanation;
  streaming: boolean;
  error?: unknown;
};

type StreamState = {
  term: string;
  data?: TermExplanation;
  streaming: boolean;
  error?: unknown;
};

const explanationQueryKey = (term: string) => ["term-explanation", term] as const;

/**
 * Returns an explanation for `term`, instantly from the react-query cache when it
 * was prefetched, otherwise streamed token-by-token so text appears immediately.
 * The final streamed result is written back into the cache.
 */
export function useLiveExplanation(term: string | null, context: string): LiveExplanationState {
  const queryClient = useQueryClient();
  const contextRef = useRef(context);
  const [stream, setStream] = useState<StreamState | null>(null);

  useEffect(() => {
    contextRef.current = context;
  }, [context]);

  useEffect(() => {
    if (!term || queryClient.getQueryData(explanationQueryKey(term))) {
      return;
    }

    const controller = new AbortController();
    explainTermStream(
      term,
      contextRef.current,
      (explanation, done) => {
        setStream({ term, data: explanation, streaming: !done });
      },
      controller.signal
    )
      .then((final) => {
        queryClient.setQueryData(explanationQueryKey(term), final);
        setStream({ term, data: final, streaming: false });
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setStream({ term, streaming: false, error });
        }
      });

    return () => controller.abort();
  }, [term, queryClient]);

  if (!term) {
    return { streaming: false };
  }

  const cached = queryClient.getQueryData<TermExplanation>(explanationQueryKey(term));
  if (cached) {
    return { data: cached, streaming: false };
  }

  if (stream && stream.term === term) {
    return { data: stream.data, streaming: stream.streaming, error: stream.error };
  }

  // Effect is about to start streaming for this term.
  return { streaming: true };
}
