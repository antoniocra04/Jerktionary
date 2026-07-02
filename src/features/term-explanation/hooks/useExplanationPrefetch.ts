import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import type { TranscriptTerm } from "@/shared/types/term";
import { explainTerm } from "@/features/term-explanation/api/explain-term";

const MAX_PREFETCH_TERMS = 12;
const PREFETCH_GAP_MS = 300;

const explanationQueryKey = (term: string) => ["term-explanation", term] as const;

/**
 * Warms the explanation cache in the background for the terms currently on screen,
 * so hovering a term shows its explanation instantly. Runs one request at a time
 * with a small gap to avoid competing with live transcription for the GPU.
 */
export function useExplanationPrefetch(terms: TranscriptTerm[], context: string): void {
  const queryClient = useQueryClient();
  const contextRef = useRef(context);
  const queueRef = useRef<string[]>([]);
  const enqueuedRef = useRef<Set<string>>(new Set());
  const runningRef = useRef(false);

  useEffect(() => {
    contextRef.current = context;
  }, [context]);

  const drainQueue = useCallback(async () => {
    if (runningRef.current) {
      return;
    }
    runningRef.current = true;
    try {
      while (queueRef.current.length > 0) {
        const key = queueRef.current.shift();
        if (!key || queryClient.getQueryData(explanationQueryKey(key))) {
          continue;
        }
        try {
          await queryClient.prefetchQuery({
            queryKey: explanationQueryKey(key),
            queryFn: ({ signal }) => explainTerm(key, contextRef.current, signal),
            staleTime: Number.POSITIVE_INFINITY,
            gcTime: 1000 * 60 * 60
          });
        } catch {
          enqueuedRef.current.delete(key); // allow a later retry
        }
        await new Promise((resolve) => setTimeout(resolve, PREFETCH_GAP_MS));
      }
    } finally {
      runningRef.current = false;
    }
  }, [queryClient]);

  useEffect(() => {
    const unique = [...new Map(terms.map((term) => [term.normalized || term.text, term])).values()]
      .filter((term) => term.normalized || term.text)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, MAX_PREFETCH_TERMS);

    for (const term of unique) {
      const key = term.normalized || term.text;
      if (enqueuedRef.current.has(key)) {
        continue;
      }
      if (queryClient.getQueryData(explanationQueryKey(key))) {
        continue;
      }
      enqueuedRef.current.add(key);
      queueRef.current.push(key);
    }

    void drainQueue();
  }, [terms, queryClient, drainQueue]);
}
