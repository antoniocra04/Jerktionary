import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { AnswerCard } from "./AnswerCard";

type LiveAnswerProps = {
  questions: string[];
  context: string;
};

export function LiveAnswer({ questions, context }: LiveAnswerProps) {
  const head = questions[0] ?? null;
  const total = questions.length;
  const [nav, setNav] = useState<{ head: string | null; index: number }>({ head: null, index: 0 });

  // A new question snaps the view back to the latest answer; otherwise the chosen
  // index is kept. Derived during render — no cascading state.
  const index = nav.head === head ? Math.min(nav.index, Math.max(0, total - 1)) : 0;

  useEffect(() => {
    if (total <= 1) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(input|textarea|select)$/i.test(target.tagName)) {
        return;
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
        event.preventDefault();
        setNav((prev) => {
          const current = prev.head === head ? prev.index : 0;
          return { head, index: Math.min(current + 1, total - 1) };
        });
      } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
        event.preventDefault();
        setNav((prev) => {
          const current = prev.head === head ? prev.index : 0;
          return { head, index: Math.max(current - 1, 0) };
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [head, total]);

  if (total === 0) {
    return (
      <section className="rounded-xl border border-line bg-surface-900 px-6 py-8">
        <div className="flex items-center gap-2 text-sm text-ink-600">
          <Sparkles className="h-4 w-4 text-accent-400" />
          Живой ответ
        </div>
        <p className="mt-2 max-w-lg text-sm leading-6 text-ink-500">
          Задайте вопрос вслух — «что такое…», «как…», «почему…» — и ответ для проговаривания
          появится здесь. Прошлые ответы переключаются стрелками, Ctrl+Shift+Space отвечает на
          последнюю фразу.
        </p>
      </section>
    );
  }

  const question = questions[index];

  return (
    <section className="space-y-2">
      <AnswerCard key={question} question={question} context={context} latest={index === 0} />

      {total > 1 && (
        <div className="flex items-center justify-between px-1 text-xs text-ink-500">
          <span>{index === 0 ? "последний вопрос" : `${total - index} из ${total}`}</span>
          <div className="flex items-center gap-1">
            <span className="mr-2 hidden text-ink-400 sm:inline">← → переключение</span>
            <button
              type="button"
              aria-label="Более старый вопрос"
              onClick={() => setNav({ head, index: Math.min(index + 1, total - 1) })}
              disabled={index >= total - 1}
              className="rounded p-1 hover:bg-ink-900/5 disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Более новый вопрос"
              onClick={() => setNav({ head, index: Math.max(index - 1, 0) })}
              disabled={index <= 0}
              className="rounded p-1 hover:bg-ink-900/5 disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
