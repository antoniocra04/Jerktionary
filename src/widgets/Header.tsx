import { Eye, EyeOff, Settings } from "lucide-react";
import { useState } from "react";
import { AudioLevelMeter } from "@/features/audio/components/AudioLevelMeter";
import { MicrophoneButton } from "@/features/audio/components/MicrophoneButton";
import { SettingsPopover } from "@/features/settings/components/SettingsPopover";
import type { WsConnectionStatus } from "@/shared/types/transcript";
import { cn } from "@/shared/utils/cn";

type HeaderProps = {
  backendReady?: boolean;
  backendUnavailable: boolean;
  backendLoading: boolean;
  listening: boolean;
  microphoneLevel: number;
  connectionStatus: WsConnectionStatus;
  disabled: boolean;
  onToggleListening: () => void;
  onRetryBackend: () => void;
};

export function Header({
  backendUnavailable,
  listening,
  microphoneLevel,
  connectionStatus,
  disabled,
  onToggleListening
}: HeaderProps) {
  const connected = connectionStatus === "connected";
  const dotClass = backendUnavailable
    ? "bg-red-400"
    : listening && connected
      ? "bg-emerald-400"
      : listening
        ? "bg-amber-400"
        : "bg-slate-600";
  const stateText = backendUnavailable
    ? "backend недоступен"
    : listening
      ? connected
        ? "в эфире"
        : connectionStatus
      : "готов";

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/10 bg-surface-950 px-5">
      <span className={cn("h-2 w-2 rounded-full", dotClass, listening && "animate-pulse")} />
      <span className="text-[15px] font-medium tracking-tight text-slate-100">Jerktionary</span>
      <span className="text-xs text-slate-500">{stateText}</span>

      <div className="ml-auto flex items-center gap-3">
        {listening && <AudioLevelMeter level={microphoneLevel} active={listening} />}
        <SettingsPopover>
          <button
            type="button"
            aria-label="Настройки"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-slate-400 hover:bg-white/5"
          >
            <Settings className="h-4 w-4" />
          </button>
        </SettingsPopover>
        <StealthToggle />
        <MicrophoneButton listening={listening} disabled={disabled} onClick={onToggleListening} />
      </div>
    </header>
  );
}

function StealthToggle() {
  const [hidden, setHidden] = useState(true);

  const toggle = () => {
    const next = !hidden;
    setHidden(next);
    void window.desktopAPI?.setContentProtection(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={hidden ? "Скрыто от захвата экрана" : "Видно при захвате экрана"}
      aria-label={hidden ? "Скрыто от захвата экрана" : "Видно при захвате экрана"}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 hover:bg-white/5",
        hidden ? "text-accent-300" : "text-slate-400"
      )}
    >
      {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}
