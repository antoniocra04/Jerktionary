export type TermType = "concept" | "noun" | "noun_phrase" | string;

export type TranscriptTerm = {
  text: string;
  normalized: string;
  start: number;
  end: number;
  type: TermType;
  confidence: number;
};

export type TermExplanationSource = "cache" | "local_llm" | "api_llm";

export type TermExplanation = {
  title: string;
  short: string;
  example: string;
  whyImportant: string;
  source: TermExplanationSource;
};
