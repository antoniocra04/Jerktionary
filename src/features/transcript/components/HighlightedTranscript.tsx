import type { TranscriptTerm } from "@/shared/types/term";
import { buildHighlightSegments } from "@/features/transcript/services/transcript-merger";
import { TermSpan } from "./TermSpan";

type HighlightedTranscriptProps = {
  text: string;
  terms: TranscriptTerm[];
};

export function HighlightedTranscript({ text, terms }: HighlightedTranscriptProps) {
  const segments = buildHighlightSegments(text, terms);

  return (
    <>
      {segments.map((segment) => {
        const key = `${segment.kind}:${segment.start}:${segment.end}`;

        if (segment.kind === "term") {
          return (
            <TermSpan
              key={key}
              term={segment.term}
              text={segment.text}
              context={extractLocalContext(text, segment.start, segment.end)}
            />
          );
        }

        return <span key={key}>{segment.text}</span>;
      })}
    </>
  );
}

function extractLocalContext(text: string, start: number, end: number): string {
  const padding = 240;
  const from = Math.max(0, start - padding);
  const to = Math.min(text.length, end + padding);
  return text.slice(from, to);
}
