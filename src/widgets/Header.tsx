import { Eye, EyeOff, PictureInPicture2, Settings } from "lucide-react";
import { useState } from "react";
import { AudioLevelMeter } from "@/features/audio/components/AudioLevelMeter";
import { MicrophoneButton } from "@/features/audio/components/MicrophoneButton";
import { MeetingsButton } from "@/features/meetings/components/MeetingsDialog";
import { SettingsPopover } from "@/features/settings/components/SettingsPopover";
import { useTranscriptStore } from "@/features/transcript/store/transcript-store";
import type { WsConnectionStatus } from "@/shared/types/transcript";
import { cn } from "@/shared/utils/cn";

type HeaderProps = {
  backendReady?: boolean;
  backendUnavailable: boolean;
  backendLoading: boolean;
  listening: boolean;
  connectionStatus: WsConnectionStatus;
  disabled: boolean;
  onToggleListening: () => void;
  onToggleOverlay: () => void;
  onRetryBackend: () => void;
};

export function Header({
  backendUnavailable,
  listening,
  connectionStatus,
  disabled,
  onToggleListening,
  onToggleOverlay
}: HeaderProps) {
  const connected = connectionStatus === "connected";
  const dotClass = backendUnavailable
    ? "bg-red-500"
    : listening && connected
      ? "bg-emerald-500"
      : listening
        ? "bg-amber-500"
        : "bg-ink-300";
  const stateText = backendUnavailable
    ? "backend недоступен"
    : listening
      ? connected
        ? "в эфире"
        : connectionStatus
      : "готов";

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface-950 px-5">
      <span className={cn("h-2 w-2 rounded-full", dotClass, listening && "animate-pulse")} />
      <span className="font-display text-[17px] tracking-tight text-ink-900">Jerktionary</span>
      <span className="text-xs text-ink-500">{stateText}</span>

      <div className="ml-auto flex items-center gap-3">
        <HeaderLevelMeter />
        <MeetingsButton />
        <button
          type="button"
          aria-label="Компактный режим поверх окон"
          title="Компактный режим поверх окон (Ctrl+Shift+O)"
          onClick={onToggleOverlay}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line text-ink-500 hover:bg-ink-900/5"
        >
          <PictureInPicture2 className="h-4 w-4" />
        </button>
        <SettingsPopover>
          <button
            type="button"
            aria-label="Настройки"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line text-ink-500 hover:bg-ink-900/5"
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

function HeaderLevelMeter() {
  // Subscribes to the fast-changing mic level in isolation so it doesn't re-render
  // the rest of the header/app.
  const level = useTranscriptStore((state) => state.microphoneLevel);
  const listening = useTranscriptStore((state) => state.isListening);
  if (!listening) {
    return null;
  }
  return <AudioLevelMeter level={level} active={listening} />;
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
        "inline-flex h-9 w-9 items-center justify-center rounded-md border border-line hover:bg-ink-900/5",
        hidden ? "text-accent-400" : "text-ink-500"
      )}
    >
      {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}
