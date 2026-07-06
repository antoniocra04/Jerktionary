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
        ready && "border-emerald-300 bg-emerald-50 text-emerald-800",
        unavailable && "border-red-300 bg-red-50 text-red-800",
        !ready && !unavailable && "border-amber-300 bg-amber-50 text-amber-800"
      )}
    >
      <Server className="h-4 w-4" />
      {label}
    </div>
  );
}
