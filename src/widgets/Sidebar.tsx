import { BackendStatusPanel } from "@/features/backend-status/components/BackendStatusPanel";
import type { LastExplanation } from "@/features/transcript/store/transcript-store";
import type { BackendComponent } from "@/shared/types/backend";
import type { TranscriptEvent } from "@/shared/types/transcript";
import type { TranscriptTerm } from "@/shared/types/term";

type SidebarProps = {
  terms: TranscriptTerm[];
  events: TranscriptEvent[];
  explanations: LastExplanation[];
  backendReady?: boolean;
  components: BackendComponent[];
};

export function Sidebar({ terms, events, explanations, backendReady, components }: SidebarProps) {
  const uniqueTerms = [...new Map(terms.map((term) => [term.normalized, term])).values()];

  return (
    <aside className="flex w-72 shrink-0 flex-col gap-6 overflow-auto border-l border-white/10 bg-surface-950 p-5">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-200">Термины</h2>
          <span className="text-xs text-slate-500">{uniqueTerms.length}</span>
        </div>
        {uniqueTerms.length === 0 ? (
          <p className="text-sm leading-6 text-slate-500">Найденные термины появятся здесь.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {uniqueTerms.map((term) => (
              <span
                key={`${term.normalized}:${term.start}`}
                className="rounded-full border border-white/10 px-2.5 py-1 text-[13px] text-slate-300"
              >
                {term.normalized}
              </span>
            ))}
          </div>
        )}
      </section>

      {explanations.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-medium text-slate-200">Недавние объяснения</h2>
          <div className="space-y-3">
            {explanations.map((item) => (
              <div key={item.term}>
                <div className="truncate text-sm text-slate-200">{item.explanation.title}</div>
                <div className="mt-0.5 line-clamp-2 text-xs leading-5 text-slate-500">
                  {item.explanation.short}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <details className="mt-auto text-sm text-slate-400">
        <summary className="cursor-pointer list-none text-xs text-slate-500 hover:text-slate-300">
          Диагностика
        </summary>
        <div className="mt-3 space-y-4">
          <BackendStatusPanel ready={backendReady} components={components} />
          <div>
            <h3 className="mb-2 text-xs text-slate-500">Последние события</h3>
            {events.length === 0 ? (
              <p className="text-xs text-slate-600">Событий пока нет.</p>
            ) : (
              <div className="space-y-1">
                {events.slice(0, 6).map((event) => (
                  <div key={`${event.type}:${event.receivedAt}`} className="text-xs text-slate-500">
                    <span className="text-slate-400">{event.type}</span>{" "}
                    {new Date(event.receivedAt).toLocaleTimeString()}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </details>
    </aside>
  );
}
