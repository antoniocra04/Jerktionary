import type { HighlightSegment } from "@/shared/types/transcript";
import type { TranscriptTerm } from "@/shared/types/term";

type NormalizedSpan = TranscriptTerm & {
  key: string;
};

export function buildHighlightSegments(text: string, terms: TranscriptTerm[]): HighlightSegment[] {
  if (text.length === 0 || terms.length === 0) {
    return [{ kind: "text", text, start: 0, end: text.length }];
  }

  const spans = normalizeSpans(text, terms);
  const segments: HighlightSegment[] = [];
  let cursor = 0;

  for (const term of spans) {
    if (term.start > cursor) {
      segments.push({
        kind: "text",
        text: text.slice(cursor, term.start),
        start: cursor,
        end: term.start
      });
    }

    segments.push({
      kind: "term",
      text: text.slice(term.start, term.end),
      start: term.start,
      end: term.end,
      term
    });
    cursor = term.end;
  }

  if (cursor < text.length) {
    segments.push({
      kind: "text",
      text: text.slice(cursor),
      start: cursor,
      end: text.length
    });
  }

  return segments;
}

export function mergeTerms(previous: TranscriptTerm[], incoming: TranscriptTerm[]): TranscriptTerm[] {
  const map = new Map<string, TranscriptTerm>();

  for (const term of [...previous, ...incoming]) {
    const key = createTermKey(term);
    map.set(key, term);
  }

  return [...map.values()].sort((a, b) => a.start - b.start || b.end - a.end);
}

function normalizeSpans(text: string, terms: TranscriptTerm[]): NormalizedSpan[] {
  const unique = new Map<string, NormalizedSpan>();

  for (const term of terms) {
    if (!isValidSpan(text, term)) {
      continue;
    }

    unique.set(createTermKey(term), {
      ...term,
      key: createTermKey(term)
    });
  }

  const sorted = [...unique.values()].sort((a, b) => {
    const byStart = a.start - b.start;
    if (byStart !== 0) {
      return byStart;
    }

    return spanLength(b) - spanLength(a);
  });

  const selected: NormalizedSpan[] = [];

  for (const span of sorted) {
    const overlaps = selected.some((existing) => spansOverlap(existing, span));
    if (!overlaps) {
      selected.push(span);
      continue;
    }

    const overlapIndex = selected.findIndex((existing) => spansOverlap(existing, span));
    const existing = selected[overlapIndex];
    if (existing && spanLength(span) > spanLength(existing)) {
      selected[overlapIndex] = span;
    }
  }

  return selected.sort((a, b) => a.start - b.start);
}

function isValidSpan(text: string, term: TranscriptTerm): boolean {
  return term.start >= 0 && term.end <= text.length && term.start < term.end;
}

function createTermKey(term: TranscriptTerm): string {
  return `${term.normalized}:${term.start}:${term.end}`;
}

function spanLength(term: TranscriptTerm): number {
  return term.end - term.start;
}

function spansOverlap(a: TranscriptTerm, b: TranscriptTerm): boolean {
  return a.start < b.end && b.start < a.end;
}
