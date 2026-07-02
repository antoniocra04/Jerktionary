import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import type { LiveAnswer } from "@/shared/types/answer";
import { answerQuestionStream } from "@/features/live-answer/api/answer-question-stream";

export type LiveAnswerState = {
  question: string | null;
  data?: LiveAnswer;
  streaming: boolean;
  error?: unknown;
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

  useEffect(() => {
    contextRef.current = context;
  }, [context]);

  useEffect(() => {
    if (!question || queryClient.getQueryData(answerQueryKey(question, deep))) {
      return;
    }

    const controller = new AbortController();
    answerQuestionStream(
      question,
      contextRef.current,
      deep,
      (answer, done) => {
        setStream({ question, deep, data: answer, streaming: !done });
      },
      controller.signal
    )
      .then((final) => {
        queryClient.setQueryData(answerQueryKey(question, deep), final);
        setStream({ question, deep, data: final, streaming: false });
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setStream({ question, deep, streaming: false, error });
        }
      });

    return () => controller.abort();
  }, [question, deep, queryClient]);

  if (!question) {
    return { question: null, streaming: false };
  }

  const cached = queryClient.getQueryData<LiveAnswer>(answerQueryKey(question, deep));
  if (cached) {
    return { question, data: cached, streaming: false };
  }

  if (stream && stream.question === question && stream.deep === deep) {
    return { question, data: stream.data, streaming: stream.streaming, error: stream.error };
  }

  return { question, streaming: true };
}
