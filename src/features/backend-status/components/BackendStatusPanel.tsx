import { AlertTriangle, CheckCircle2, Circle } from "lucide-react";
import type { BackendComponent } from "@/shared/types/backend";
import { cn } from "@/shared/utils/cn";

type BackendStatusPanelProps = {
  ready?: boolean;
  components: BackendComponent[];
};

export function BackendStatusPanel({ ready, components }: BackendStatusPanelProps) {
  if (components.length === 0) {
    return (
      <section className="rounded-md border border-white/10 bg-surface-900 p-4">
        <div className="text-sm text-slate-400">Статус компонентов пока неизвестен</div>
      </section>
    );
  }

  return (
    <section className="rounded-md border border-white/10 bg-surface-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-100">Backend components</h2>
        <span
          className={cn(
            "rounded px-2 py-1 text-xs",
            ready ? "bg-emerald-500/10 text-emerald-200" : "bg-amber-500/10 text-amber-100"
          )}
        >
          {ready ? "ready=true" : "ready=false"}
        </span>
      </div>

      <div className="space-y-2">
        {components.map((component) => (
          <div
            key={component.name}
            className="grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-2 rounded bg-white/[0.03] px-2 py-2"
          >
            {component.ready ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            ) : component.required ? (
              <AlertTriangle className="h-4 w-4 text-red-300" />
            ) : (
              <Circle className="h-4 w-4 text-amber-300" />
            )}
            <div className="min-w-0">
              <div className="truncate text-sm text-slate-100">{component.name}</div>
              <div className="truncate text-xs text-slate-500">{component.details || "no details"}</div>
            </div>
            <span className="text-xs text-slate-500">{component.required ? "required" : "optional"}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
