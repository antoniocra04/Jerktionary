import { Server } from "lucide-react";
import { cn } from "@/shared/utils/cn";

type BackendStatusBadgeProps = {
  ready?: boolean;
  unavailable?: boolean;
  loading?: boolean;
};

export function BackendStatusBadge({ ready, unavailable, loading }: BackendStatusBadgeProps) {
  const label = loading
    ? "Checking backend"
    : unavailable
      ? "Backend недоступен"
      : ready
        ? "Backend ready"
        : "Backend not ready";

  return (
    <div
      className={cn(
        "inline-flex h-8 items-center gap-2 rounded-md border px-3 text-sm",
        ready && "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
        unavailable && "border-red-500/30 bg-red-500/10 text-red-200",
        !ready && !unavailable && "border-amber-500/30 bg-amber-500/10 text-amber-100"
      )}
    >
      <Server className="h-4 w-4" />
      {label}
    </div>
  );
}
