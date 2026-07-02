import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QueryProvider } from "@/app/providers/QueryProvider";
import { HighlightedTranscript } from "./HighlightedTranscript";

describe("HighlightedTranscript", () => {
  it("renders highlighted term text without changing surrounding text", () => {
    render(
      <QueryProvider>
        <HighlightedTranscript
          text="PostgreSQL и Kafka"
          terms={[
            {
              text: "PostgreSQL",
              normalized: "PostgreSQL",
              start: 0,
              end: 10,
              type: "concept",
              confidence: 0.95
            }
          ]}
        />
      </QueryProvider>
    );

    expect(screen.getByText("PostgreSQL")).toBeInTheDocument();
    expect(screen.getByText("и Kafka")).toBeInTheDocument();
  });
});
