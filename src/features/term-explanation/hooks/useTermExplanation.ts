import { useQuery } from "@tanstack/react-query";
import { HttpError } from "@/shared/api/http-client";
import { explainTerm } from "@/features/term-explanation/api/explain-term";

export function useTermExplanation(term: string | null, context: string) {
  return useQuery({
    queryKey: ["term-explanation", term],
    queryFn: ({ signal }) => {
      if (!term) {
        throw new Error("Term is required");
      }

      return explainTerm(term, context, signal);
    },
    enabled: Boolean(term),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 1000 * 60 * 60,
    retry: (failureCount, error) => {
      if (error instanceof HttpError && error.code?.startsWith("LLM_")) {
        return false;
      }

      return failureCount < 1;
    }
  });
}

export function getExplanationErrorMessage(error: unknown): string {
  if (error instanceof HttpError) {
    if (error.code === "LLM_UNAVAILABLE") {
      return "Локальная модель объяснений сейчас недоступна";
    }

    if (error.code === "LLM_BAD_RESPONSE") {
      return "Модель вернула некорректный ответ";
    }

    if (error.code === "VALIDATION_ERROR") {
      return "Некорректный термин или контекст";
    }

    if (error.code === "INTERNAL_ERROR") {
      return "Ошибка backend";
    }
  }

  return "Не удалось получить объяснение";
}
