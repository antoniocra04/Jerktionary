import type { TranscriptTerm } from "@/shared/types/term";
import { TermPopover } from "@/features/term-explanation/components/TermPopover";

type TermSpanProps = {
  term: TranscriptTerm;
  text: string;
  context: string;
};

export function TermSpan({ term, text, context }: TermSpanProps) {
  return (
    <TermPopover term={term} context={context}>
      <span className="rounded bg-accent-400/15 px-1 py-0.5 text-accent-100 ring-1 ring-accent-400/20 transition hover:bg-accent-400/25">
        {text}
      </span>
    </TermPopover>
  );
}
