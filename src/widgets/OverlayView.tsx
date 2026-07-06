import { Maximize2, Sparkles } from "lucide-react";
import { AnswerCard } from "@/features/live-answer/components/AnswerCard";
import { cn } from "@/shared/utils/cn";

type OverlayViewProps = {
  questions: string[];
  context: string;
  listening: boolean;
  onExit: () => void;
};

/** Compact always-on-top mode: only the latest answer, sized for a corner of the
 * screen during a call. Ctrl+Shift+O (or the button) returns to the full window. */
export function OverlayView({ questions, context, listening, onExit }: OverlayViewProps) {
  const question = questions[0] ?? null;

  return (
    <div className="flex h-screen flex-col bg-surface-950 p-3 text-ink-900">
      <div className="mb-2 flex items-center gap-2">
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            listening ? "animate-pulse bg-emerald-500" : "bg-ink-300"
          )}
        />
        <span className="text-xs text-ink-500">
          {listening ? "слушаю" : "пауза"} · Ctrl+Shift+Space — ответить сейчас
        </span>
        <button
          type="button"
          aria-label="Выйти из компактного режима"
          title="Выйти из компактного режима (Ctrl+Shift+O)"
          onClick={onExit}
          className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-ink-500 hover:bg-ink-900/5"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {question ? (
          <AnswerCard key={question} question={question} context={context} latest />
        ) : (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-line">
            <p className="flex items-center gap-2 px-4 text-center text-sm text-ink-500">
              <Sparkles className="h-4 w-4 shrink-0 text-accent-400" />
              Ответ на последний вопрос появится здесь
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
