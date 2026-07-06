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
      <section className="rounded-md border border-line bg-surface-900 p-4">
        <div className="text-sm text-ink-600">Статус компонентов пока неизвестен</div>
      </section>
    );
  }

  return (
    <section className="rounded-md border border-line bg-surface-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-900">Backend components</h2>
        <span
          className={cn(
            "rounded px-2 py-1 text-xs",
            ready ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
          )}
        >
          {ready ? "ready=true" : "ready=false"}
        </span>
      </div>

      <div className="space-y-2">
        {components.map((component) => (
          <div
            key={component.name}
            className="grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-2 rounded bg-ink-900/[0.04] px-2 py-2"
          >
            {component.ready ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : component.required ? (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            ) : (
              <Circle className="h-4 w-4 text-amber-600" />
            )}
            <div className="min-w-0">
              <div className="truncate text-sm text-ink-900">{component.name}</div>
              <div className="truncate text-xs text-ink-500">
                {component.details || "no details"}
              </div>
            </div>
            <span className="text-xs text-ink-500">
              {component.required ? "required" : "optional"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
