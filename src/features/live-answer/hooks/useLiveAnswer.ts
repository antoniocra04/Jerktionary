import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LiveAnswer } from "@/shared/types/answer";
import { answerQuestionStream } from "@/features/live-answer/api/answer-question-stream";
import { useTranscriptStore } from "@/features/transcript/store/transcript-store";

export type LiveAnswerState = {
  question: string | null;
  data?: LiveAnswer;
  streaming: boolean;
  error?: unknown;
  /** Drops the cached answer and generates it again. */
  regenerate: () => void;
};

const answerQueryKey = (question: string, deep: boolean) =>
  ["live-answer", question, deep] as const;

type StreamState = {
  question: string;
  deep: boolean;
  data?: LiveAnswer;
  streaming: boolean;
  error?: unknown;
};

type InflightStream = {
  latest?: LiveAnswer;
  done: boolean;
  error?: unknown;
  listeners: Set<() => void>;
};

const inflightStreams = new Map<string, InflightStream>();

const inflightKey = (question: string, deep: boolean) => JSON.stringify([question, deep]);

/**
 * Starts (or re-attaches to) the stream for question+deep. The stream is shared
 * module-wide and keeps running after every card unmounts, so a half-generated
 * answer still lands in the cache instead of being aborted and regenerated on
 * the next mount (arrow navigation, question-list reorder, StrictMode remount).
 */
function ensureStream(
  queryClient: QueryClient,
  question: string,
  deep: boolean,
  context: string
): InflightStream {
  const key = inflightKey(question, deep);
  const existing = inflightStreams.get(key);
  if (existing) {
    return existing;
  }

  const entry: InflightStream = { done: false, listeners: new Set() };
  inflightStreams.set(key, entry);
  const notify = () => entry.listeners.forEach((listener) => listener());

  // Answers have no useQuery observers, so without this react-query would GC
  // them after its default 5 minutes and old questions would regenerate.
  queryClient.setQueryDefaults(["live-answer"], { gcTime: 1000 * 60 * 60 });

  const store = useTranscriptStore.getState();
  store.beginAnswerStreaming();

  answerQuestionStream(question, context, deep, (answer) => {
    entry.latest = answer;
    notify();
  })
    .then((final) => {
      queryClient.setQueryData(answerQueryKey(question, deep), final);
      entry.latest = final;
      useTranscriptStore.getState().recordAnswer(question, final);
      if (!deep && !queryClient.getQueryData(answerQueryKey(question, true))) {
        // Pre-generate the detailed variant in the background so tapping
        // "Подробнее" is instant instead of starting a fresh stream.
        ensureStream(queryClient, question, true, context);
      }
    })
    .catch((error) => {
      entry.error = error;
    })
    .finally(() => {
      entry.done = true;
      inflightStreams.delete(key);
      store.endAnswerStreaming();
      notify();
    });

  return entry;
}

/**
 * Streams a spoken-style answer for the current question. Cached per question+depth
 * in react-query, so re-detecting the same question (or toggling depth back) is
 * instant instead of regenerating.
 */
export function useLiveAnswer(
  question: string | null,
  deep: boolean,
  context: string
): LiveAnswerState {
  const queryClient = useQueryClient();
  const contextRef = useRef(context);
  const [stream, setStream] = useState<StreamState | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    contextRef.current = context;
  }, [context]);

  useEffect(() => {
    if (!question || queryClient.getQueryData(answerQueryKey(question, deep))) {
      return;
    }

    const entry = ensureStream(queryClient, question, deep, contextRef.current);
    const listener = () => {
      setStream({
        question,
        deep,
        data: entry.latest,
        streaming: !entry.done,
        error: entry.error
      });
    };
    entry.listeners.add(listener);
    listener();

    return () => {
      entry.listeners.delete(listener);
    };
  }, [question, deep, queryClient, attempt]);

  const regenerate = useCallback(() => {
    if (!question || inflightStreams.has(inflightKey(question, deep))) {
      return;
    }
    queryClient.removeQueries({ queryKey: answerQueryKey(question, deep), exact: true });
    setStream(null);
    setAttempt((value) => value + 1);
  }, [question, deep, queryClient]);

  if (!question) {
    return { question: null, streaming: false, regenerate };
  }

  const cached = queryClient.getQueryData<LiveAnswer>(answerQueryKey(question, deep));
  if (cached) {
    return { question, data: cached, streaming: false, regenerate };
  }

  if (stream && stream.question === question && stream.deep === deep) {
    return {
      question,
      data: stream.data,
      streaming: stream.streaming,
      error: stream.error,
      regenerate
    };
  }

  return { question, streaming: true, regenerate };
}
