import { requestJson } from "@/shared/api/http-client";
import type { TermExplanation } from "@/shared/types/term";
import { termContext } from "@/shared/utils/context-slice";

type ExplainTermRequestDto = {
  term: string;
  context?: string;
};

type ExplainTermResponseDto = {
  title: string;
  short: string;
  example: string;
  why_important: string;
  source: "cache" | "local_llm" | "api_llm";
};

export async function explainTerm(
  term: string,
  context: string,
  signal?: AbortSignal
): Promise<TermExplanation> {
  const dto = await requestJson<ExplainTermResponseDto, ExplainTermRequestDto>(
    "/api/terms/explain",
    {
      method: "POST",
      body: {
        term,
        context: termContext(context, term, 2000)
      },
      signal
    }
  );

  return {
    title: dto.title,
    short: dto.short,
    example: dto.example,
    whyImportant: dto.why_important,
    source: dto.source
  };
}
