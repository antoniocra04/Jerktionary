import { Check, Copy, Loader2, RotateCcw } from "lucide-react";
import { useState } from "react";
import { getExplanationErrorMessage } from "@/features/term-explanation/hooks/useTermExplanation";
import { useLiveAnswer } from "@/features/live-answer/hooks/useLiveAnswer";
import { cn } from "@/shared/utils/cn";

type AnswerCardProps = {
  question: string;
  context: string;
  latest: boolean;
};

export function AnswerCard({ question, context, latest }: AnswerCardProps) {
  const [deep, setDeep] = useState(false);
  const [copied, setCopied] = useState(false);

  const state = useLiveAnswer(question, deep, context);
  const data = state.data;
  const errorMessage = state.error ? getExplanationErrorMessage(state.error) : undefined;

  const onCopy = () => {
    if (!data) return;
    const text = [data.answer, ...data.points.map((point) => `— ${point}`), data.example]
      .filter(Boolean)
      .join("\n");
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <article
      className={cn(
        "rounded-xl border bg-surface-900 px-5 py-4",
        latest ? "border-accent-500/30 shadow-popover" : "border-line"
      )}
    >
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-sm text-ink-600">{question}</p>
        {state.streaming && (
          <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-accent-300">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            печатается
          </span>
        )}
      </div>

      {errorMessage ? (
        <div className="mt-2">
          <p className="text-sm text-red-700">{errorMessage}</p>
          <button
            type="button"
            onClick={state.regenerate}
            className="mt-2 inline-flex items-center gap-1.5 text-xs text-ink-500 hover:text-ink-900"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Попробовать ещё раз
          </button>
        </div>
      ) : !data ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-ink-500">
          <Loader2 className="h-4 w-4 animate-spin text-accent-400" />
          Готовлю ответ…
        </div>
      ) : (
        <>
          {data.answer && (
            <p className="mt-2 font-display text-[19px] leading-relaxed text-ink-900">
              {data.answer}
            </p>
          )}

          {data.points.length > 0 && (
            <ul className="mt-3 space-y-2">
              {data.points.map((point, index) => (
                <li key={index} className="flex gap-2.5 text-[15px] leading-relaxed text-ink-700">
                  <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-accent-400" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          )}

          {data.example && (
            <p className="mt-3 rounded-lg bg-ink-900/[0.04] px-3 py-2 text-sm italic leading-relaxed text-ink-600">
              {data.example}
            </p>
          )}

          <div className="mt-4 flex items-center gap-4 text-xs text-ink-500">
            <button
              type="button"
              onClick={() => setDeep((value) => !value)}
              className="hover:text-ink-900"
            >
              {deep ? "Короче" : "Подробнее"}
            </button>
            <button
              type="button"
              onClick={onCopy}
              aria-label="Скопировать ответ"
              className="inline-flex items-center gap-1.5 hover:text-ink-900"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-accent-300" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "Скопировано" : "Копировать"}
            </button>
            {!state.streaming && (
              <button
                type="button"
                onClick={state.regenerate}
                aria-label="Перегенерировать ответ"
                className="inline-flex items-center gap-1.5 hover:text-ink-900"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Перегенерировать
              </button>
            )}
          </div>
        </>
      )}
    </article>
  );
}
