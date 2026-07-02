import * as Popover from "@radix-ui/react-popover";
import { useQueryClient } from "@tanstack/react-query";
import { Mic, Volume2 } from "lucide-react";
import type { PropsWithChildren, ReactNode } from "react";
import { useState } from "react";
import {
  DEFAULT_DISPLAY_NAME,
  type AudioSource,
  useSettingsStore
} from "@/features/settings/store/settings-store";
import { cn } from "@/shared/utils/cn";

export function SettingsPopover({ children }: PropsWithChildren) {
  const [open, setOpen] = useState(false);
  const backendHttpUrl = useSettingsStore((state) => state.backendHttpUrl);
  const displayName = useSettingsStore((state) => state.displayName);
  const audioSource = useSettingsStore((state) => state.audioSource);
  const queryClient = useQueryClient();

  const [url, setUrl] = useState(backendHttpUrl);
  const [name, setName] = useState(displayName);
  const [source, setSource] = useState<AudioSource>(audioSource);

  const onOpenChange = (next: boolean) => {
    if (next) {
      setUrl(backendHttpUrl);
      setName(displayName);
      setSource(audioSource);
    }
    setOpen(next);
  };

  const save = () => {
    useSettingsStore.getState().setBackendHttpUrl(url);
    useSettingsStore.getState().setDisplayName(name);
    useSettingsStore.getState().setAudioSource(source);
    void window.desktopAPI?.setWindowTitle(name.trim() || DEFAULT_DISPLAY_NAME);
    void queryClient.invalidateQueries({ queryKey: ["backend"] });
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>{children}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="end"
          sideOffset={8}
          className="z-50 w-80 rounded-xl border border-white/10 bg-surface-900 p-4 shadow-popover outline-none"
        >
          <h3 className="text-sm font-medium text-slate-100">Настройки</h3>

          <div className="mt-4">
            <span className="text-xs text-slate-400">Источник звука</span>
            <div className="mt-2 grid grid-cols-2 rounded-md border border-white/10 bg-surface-800 p-1">
              <AudioSourceButton
                active={source === "microphone"}
                icon={<Mic className="h-4 w-4" />}
                label="Микрофон"
                onClick={() => setSource("microphone")}
              />
              <AudioSourceButton
                active={source === "system"}
                icon={<Volume2 className="h-4 w-4" />}
                label="Система"
                onClick={() => setSource("system")}
              />
            </div>
            <span className="mt-1 block text-[11px] leading-4 text-slate-600">
              Системный звук записывает аудио, которое воспроизводится на компьютере.
            </span>
          </div>

          <label className="mt-4 block">
            <span className="text-xs text-slate-400">URL бэкенда</span>
            <input
              type="text"
              value={url}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              onChange={(event) => setUrl(event.target.value)}
              placeholder="http://127.0.0.1:8000"
              className="mt-1 w-full rounded-md border border-white/10 bg-surface-800 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-accent-500/60"
            />
            <span className="mt-1 block text-[11px] leading-4 text-slate-600">
              WebSocket и Swagger берутся отсюда автоматически.
            </span>
          </label>

          <label className="mt-4 block">
            <span className="text-xs text-slate-400">Имя в диспетчере задач</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={DEFAULT_DISPLAY_NAME}
              className="mt-1 w-full rounded-md border border-white/10 bg-surface-800 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-accent-500/60"
            />
            <span className="mt-1 block text-[11px] leading-4 text-slate-600">
              Название окна и приложения, видимое в системе.
            </span>
          </label>

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-white/10 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={save}
              className="rounded-md bg-accent-500 px-3 py-1.5 text-sm font-medium text-slate-950 hover:bg-accent-400"
            >
              Сохранить
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function AudioSourceButton({
  active,
  icon,
  label,
  onClick
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-8 items-center justify-center gap-2 rounded px-2 text-xs font-medium transition",
        active ? "bg-accent-500 text-slate-950" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
