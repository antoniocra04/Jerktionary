import type { TranscriptTerm } from "@/shared/types/term";
import { HighlightedTranscript } from "./HighlightedTranscript";

type TranscriptLineProps = {
  text: string;
  terms: TranscriptTerm[];
};

export function TranscriptLine({ text, terms }: TranscriptLineProps) {
  return (
    <p className="whitespace-pre-wrap font-display text-[22px] leading-10 text-ink-900">
      <HighlightedTranscript text={text} terms={terms} />
    </p>
  );
}
