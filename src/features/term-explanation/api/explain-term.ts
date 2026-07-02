import { requestJson } from "@/shared/api/http-client";
import {
  getBackendModelSettings,
  type ModelApiSettings
} from "@/features/settings/store/settings-store";
import type { TermExplanation } from "@/shared/types/term";

type ExplainTermRequestDto = {
  term: string;
  context?: string;
  llm: ModelApiSettings;
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
        context: context.slice(0, 2000),
        llm: getBackendModelSettings().llm
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
