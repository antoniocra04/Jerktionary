import { cn } from "@/shared/utils/cn";

type AudioLevelMeterProps = {
  level: number;
  active: boolean;
};

export function AudioLevelMeter({ level, active }: AudioLevelMeterProps) {
  return (
    <div className="flex h-8 w-24 items-center gap-1" aria-label="Microphone level">
      {Array.from({ length: 12 }).map((_, index) => {
        const threshold = (index + 1) / 12;
        const isLit = active && level >= threshold;

        return (
          <span
            key={index}
            className={cn(
              "h-2 flex-1 rounded-sm bg-ink-900/10 transition-colors",
              isLit && "bg-accent-500"
            )}
          />
        );
      })}
    </div>
  );
}
