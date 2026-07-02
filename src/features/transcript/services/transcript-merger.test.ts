import { describe, expect, it } from "vitest";
import { buildHighlightSegments } from "./transcript-merger";
import type { TranscriptTerm } from "@/shared/types/term";

function term(partial: Partial<TranscriptTerm>): TranscriptTerm {
  return {
    text: "term",
    normalized: "term",
    start: 0,
    end: 4,
    type: "concept",
    confidence: 0.9,
    ...partial
  };
}

describe("buildHighlightSegments", () => {
  it("highlights exact backend ranges", () => {
    const text = "я читал про теорию относительности";
    const segments = buildHighlightSegments(text, [
      term({
        text: "теорию относительности",
        normalized: "теория относительности",
        start: 12,
        end: 34
      })
    ]);

    expect(segments).toEqual([
      { kind: "text", text: "я читал про ", start: 0, end: 12 },
      {
        kind: "term",
        text: "теорию относительности",
        start: 12,
        end: 34,
        term: expect.objectContaining({ normalized: "теория относительности" })
      }
    ]);
  });

  it("keeps the longest span when ranges overlap", () => {
    const text = "составной индекс PostgreSQL ускоряет запрос";
    const segments = buildHighlightSegments(text, [
      term({ text: "индекс PostgreSQL", normalized: "индекс PostgreSQL", start: 10, end: 27 }),
      term({
        text: "составной индекс PostgreSQL",
        normalized: "составной индекс PostgreSQL",
        start: 0,
        end: 27
      })
    ]);

    expect(segments).toHaveLength(2);
    expect(segments[0]).toMatchObject({
      kind: "term",
      text: "составной индекс PostgreSQL",
      start: 0,
      end: 27
    });
  });

  it("ignores invalid spans", () => {
    const segments = buildHighlightSegments("Kafka и Qwen3-8B", [
      term({ text: "bad", normalized: "bad", start: -1, end: 40 }),
      term({ text: "Kafka", normalized: "Kafka", start: 0, end: 5 })
    ]);

    expect(segments.filter((segment) => segment.kind === "term")).toHaveLength(1);
  });
});
