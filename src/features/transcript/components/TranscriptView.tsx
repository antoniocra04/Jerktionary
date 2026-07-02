import { MessageSquareText } from "lucide-react";
import type { TranscriptTerm } from "@/shared/types/term";
import { TranscriptLine } from "./TranscriptLine";

type TranscriptViewProps = {
  text: string;
  terms: TranscriptTerm[];
};

export function TranscriptView({ text, terms }: TranscriptViewProps) {
  if (!text) {
    return (
      <section className="flex h-full min-h-[420px] items-center justify-center rounded-md border border-dashed border-white/10 bg-surface-900">
        <div className="max-w-sm text-center">
          <MessageSquareText className="mx-auto mb-3 h-9 w-9 text-slate-600" />
          <h2 className="text-base font-medium text-slate-300">Транскрипт пока пуст</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Нажмите «Слушать», чтобы начать потоковую расшифровку с микрофона.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="h-full min-h-[420px] overflow-auto rounded-md border border-white/10 bg-surface-900 p-6">
      <TranscriptLine text={text} terms={terms} />
    </section>
  );
}
