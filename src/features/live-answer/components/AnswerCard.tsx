import { Check, Copy, Loader2 } from "lucide-react";
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
        latest ? "border-accent-500/25" : "border-white/10"
      )}
    >
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-sm text-slate-400">{question}</p>
        {state.streaming && (
          <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-accent-300">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            печатается
          </span>
        )}
      </div>

      {errorMessage ? (
        <p className="mt-2 text-sm text-red-200">{errorMessage}</p>
      ) : !data ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-accent-400" />
          Готовлю ответ…
        </div>
      ) : (
        <>
          {data.answer && (
            <p className="mt-2 text-[17px] font-medium leading-relaxed text-slate-50">
              {data.answer}
            </p>
          )}

          {data.points.length > 0 && (
            <ul className="mt-3 space-y-2">
              {data.points.map((point, index) => (
                <li key={index} className="flex gap-2.5 text-[15px] leading-relaxed text-slate-300">
                  <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-accent-400" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          )}

          {data.example && (
            <p className="mt-3 rounded-lg bg-white/[0.03] px-3 py-2 text-sm leading-relaxed text-slate-400">
              {data.example}
            </p>
          )}

          <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
            <button
              type="button"
              onClick={() => setDeep((value) => !value)}
              className="hover:text-slate-200"
            >
              {deep ? "Короче" : "Подробнее"}
            </button>
            <button
              type="button"
              onClick={onCopy}
              aria-label="Скопировать ответ"
              className="inline-flex items-center gap-1.5 hover:text-slate-200"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-accent-300" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "Скопировано" : "Копировать"}
            </button>
          </div>
        </>
      )}
    </article>
  );
}
