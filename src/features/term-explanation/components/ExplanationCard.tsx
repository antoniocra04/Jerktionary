import { Loader2 } from "lucide-react";
import type { TermExplanation } from "@/shared/types/term";
import { cn } from "@/shared/utils/cn";

type ExplanationCardProps = {
  explanation?: TermExplanation;
  loading: boolean;
  streaming?: boolean;
  error?: string;
};

export function ExplanationCard({ explanation, loading, streaming, error }: ExplanationCardProps) {
  if (loading) {
    return (
      <div className="flex min-h-28 w-80 items-center gap-3 rounded-md border border-white/10 bg-surface-900 p-4 text-sm text-slate-300 shadow-popover">
        <Loader2 className="h-4 w-4 animate-spin text-accent-400" />
        Loading explanation
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-80 rounded-md border border-red-500/20 bg-surface-900 p-4 text-sm text-red-100 shadow-popover">
        {error}
      </div>
    );
  }

  if (!explanation) {
    return null;
  }

  return (
    <article className="w-96 rounded-md border border-white/10 bg-surface-900 p-4 shadow-popover">
      <div className="mb-2 flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-50">
          {explanation.title}
          {streaming && (
            <Loader2 className="ml-2 inline h-3.5 w-3.5 animate-spin align-[-2px] text-accent-400" />
          )}
        </h3>
        <span
          className={cn(
            "shrink-0 rounded px-2 py-1 text-[11px] font-medium",
            explanation.source === "cache"
              ? "bg-blue-500/15 text-blue-200"
              : "bg-accent-500/15 text-accent-200"
          )}
        >
          {explanation.source === "cache" ? "Cached" : "Generated locally"}
        </span>
      </div>
      <p className="text-sm leading-6 text-slate-200">{explanation.short}</p>
      <dl className="mt-3 space-y-2 text-sm">
        {explanation.example && (
          <div>
            <dt className="text-xs text-slate-500">Пример</dt>
            <dd className="mt-1 text-slate-300">{explanation.example}</dd>
          </div>
        )}
        {explanation.whyImportant && (
          <div>
            <dt className="text-xs text-slate-500">Зачем нужно</dt>
            <dd className="mt-1 text-slate-300">{explanation.whyImportant}</dd>
          </div>
        )}
      </dl>
    </article>
  );
}
