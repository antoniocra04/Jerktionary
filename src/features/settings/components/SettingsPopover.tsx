import * as Popover from "@radix-ui/react-popover";
import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Info, Mic, Volume2 } from "lucide-react";
import type { PropsWithChildren, ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  detectVirtualAudioDevice,
  getDeviceInstallUrl,
  hasMultiOutputDevice,
  KNOWN_VIRTUAL_DEVICES,
  MULTI_OUTPUT_HELP_URL
} from "@/features/audio/services/mac-audio-utils";
import { DEFAULT_DISPLAY_NAME, type AudioSource, useSettingsStore } from "@/features/settings/store/settings-store";
import { cn } from "@/shared/utils/cn";

const inputClass =
  "mt-1 w-full rounded-md border border-line bg-surface-900 px-3 py-2 text-sm text-ink-900 outline-none placeholder:text-ink-400 focus:border-accent-500/60";

const hintClass = "mt-1 block text-[11px] leading-4 text-ink-400";

export function SettingsPopover({ children }: PropsWithChildren) {
  const [open, setOpen] = useState(false);
  const store = useSettingsStore();
  const queryClient = useQueryClient();

  const [url, setUrl] = useState(store.backendHttpUrl);
  const [name, setName] = useState(store.displayName);
  const [about, setAbout] = useState(store.aboutMe);
  const [source, setSource] = useState<AudioSource>(store.audioSource);
  const [deviceId, setDeviceId] = useState(store.audioInputDeviceId);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  // macOS-specific state for virtual-device fallback hints.
  const [platform, setPlatform] = useState("");
  const [macVirtualDevice, setMacVirtualDevice] = useState<MediaDeviceInfo | null>(null);
  const [macMultiOutputExists, setMacMultiOutputExists] = useState(true);

  // Detect platform once on mount.
  useEffect(() => {
    void window.desktopAPI?.getPlatform().then((p) => setPlatform(p ?? ""));
  }, []);

  // Detect virtual device & Multi-Output status when system source is selected on macOS.
  useEffect(() => {
    if (platform !== "darwin" || source !== "system") {
      return;
    }
    let cancelled = false;
    void (async () => {
      const vd = await detectVirtualAudioDevice();
      if (cancelled) return;
      setMacVirtualDevice(vd);
      if (vd) {
        const moe = await hasMultiOutputDevice();
        if (!cancelled) setMacMultiOutputExists(moe);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [platform, source]);

  // Derive effective macOS state during render.
  const effectiveVirtualDevice =
    platform === "darwin" && source === "system" ? macVirtualDevice : null;
  const effectiveMultiOutputExists =
    platform === "darwin" && source === "system" ? macMultiOutputExists : true;

  // Device labels are only available once mic permission has been granted at
  // least once; before that the list stays generic ("Микрофон 1").
  // Also fetch devices for system source on macOS (virtual-device selector).
  useEffect(() => {
    if (
      !open ||
      !navigator.mediaDevices?.enumerateDevices ||
      (source !== "microphone" && !(platform === "darwin" && source === "system"))
    ) {
      return;
    }
    let cancelled = false;
    void navigator.mediaDevices.enumerateDevices().then((all) => {
      if (!cancelled) {
        setDevices(all.filter((device) => device.kind === "audioinput"));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, source, platform]);

  const onOpenChange = (next: boolean) => {
    if (next) {
      setUrl(store.backendHttpUrl);
      setName(store.displayName);
      setAbout(store.aboutMe);
      setSource(store.audioSource);
      setDeviceId(store.audioInputDeviceId);
    }
    setOpen(next);
  };

  const save = () => {
    const state = useSettingsStore.getState();
    state.setBackendHttpUrl(url);
    state.setDisplayName(name);
    state.setAboutMe(about);
    state.setAudioSource(source);
    state.setAudioInputDeviceId(deviceId);
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
          className="z-50 max-h-[calc(100vh-5rem)] w-[28rem] max-w-[calc(100vw-2rem)] overflow-auto rounded-xl border border-line bg-surface-900 p-4 shadow-popover outline-none"
        >
          <h3 className="font-display text-base text-ink-900">Настройки</h3>

          <div className="mt-4">
            <span className="text-xs text-ink-500">Источник звука</span>
            <div className="mt-2 grid grid-cols-2 rounded-md border border-line bg-surface-850 p-1">
              <ToggleButton
                active={source === "microphone"}
                icon={<Mic className="h-4 w-4" />}
                label="Микрофон"
                onClick={() => setSource("microphone")}
              />
              <ToggleButton
                active={source === "system"}
                icon={<Volume2 className="h-4 w-4" />}
                label="Система"
                onClick={() => setSource("system")}
              />
            </div>
            <span className={hintClass}>
              Системный звук записывает аудио, которое воспроизводится на компьютере.
            </span>
            {source === "microphone" && devices.length > 0 && (
              <select
                value={deviceId}
                onChange={(event) => setDeviceId(event.target.value)}
                className={inputClass}
              >
                <option value="">Микрофон по умолчанию</option>
                {devices.map((device, index) => (
                  <option key={device.deviceId || index} value={device.deviceId}>
                    {device.label || `Микрофон ${index + 1}`}
                  </option>
                ))}
              </select>
            )}

            {source === "system" && platform === "darwin" && effectiveVirtualDevice && devices.length > 0 && (
              <select
                value={deviceId || effectiveVirtualDevice.deviceId}
                onChange={(event) => setDeviceId(event.target.value)}
                className={inputClass}
              >
                {devices.map((device, index) => (
                  <option key={device.deviceId || index} value={device.deviceId}>
                    {device.label || `Устройство ${index + 1}`}
                  </option>
                ))}
              </select>
            )}

            {source === "system" && platform === "darwin" && !effectiveVirtualDevice && (
              <div className="mt-3 space-y-1.5 rounded-md border border-line bg-surface-900 p-2.5">
                <p className="text-[11px] leading-4 text-ink-400">
                  Для захвата системного звука на этой версии macOS требуется виртуальное
                  аудиоустройство. Установите одно из:
                </p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {KNOWN_VIRTUAL_DEVICES.map((name) => (
                    <li key={name} className="text-xs">
                      <button
                        type="button"
                        className="text-accent-500 underline hover:text-accent-400"
                        onClick={() => {
                          void window.desktopAPI?.openExternal(getDeviceInstallUrl(name));
                        }}
                      >
                        {name}
                        <ExternalLink className="ml-1 inline h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {source === "system" &&
              platform === "darwin" &&
              effectiveVirtualDevice &&
              !effectiveMultiOutputExists && (
                <div className="mt-3 flex items-start gap-2 text-[11px] leading-4 text-ink-400">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    Чтобы слышать звук при захвате, создайте Multi-Output Device в{" "}
                    <button
                      type="button"
                      className="text-accent-500 underline hover:text-accent-400"
                      onClick={() => {
                        void window.desktopAPI?.openExternal(MULTI_OUTPUT_HELP_URL);
                      }}
                    >
                      Audio MIDI Setup
                      <ExternalLink className="ml-1 inline h-3 w-3" />
                    </button>
                  </span>
                </div>
              )}
          </div>

          <label className="mt-4 block">
            <span className="text-xs text-ink-500">URL бэкенда</span>
            <input
              type="text"
              value={url}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              onChange={(event) => setUrl(event.target.value)}
              placeholder="http://127.0.0.1:8000"
              className={inputClass}
            />
            <span className={hintClass}>WebSocket и Swagger берутся отсюда автоматически.</span>
          </label>

          <label className="mt-4 block">
            <span className="text-xs text-ink-500">Имя в диспетчере задач</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={DEFAULT_DISPLAY_NAME}
              className={inputClass}
            />
            <span className={hintClass}>Название окна и приложения, видимое в системе.</span>
          </label>

          <label className="mt-4 block">
            <span className="text-xs text-ink-500">О себе</span>
            <textarea
              value={about}
              rows={3}
              maxLength={1000}
              onChange={(event) => setAbout(event.target.value)}
              placeholder="Например: frontend-разработчик, 3 года React/TypeScript, пишу на Node.js, знаю SQL"
              className={cn(inputClass, "resize-y leading-5")}
            />
            <span className={hintClass}>
              Роль, стек и опыт. Живые ответы подстраиваются под этот профиль и звучат от вашего
              лица.
            </span>
          </label>

          <div className="mt-4 border-t border-line pt-4">
            <button
              type="button"
              onClick={() => {
                useSettingsStore.getState().resetSetup();
                setOpen(false);
              }}
              className="text-xs text-ink-500 hover:text-ink-700"
            >
              Пройти настройку заново
            </button>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-line px-3 py-1.5 text-sm text-ink-600 hover:bg-ink-900/5"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={save}
              className="rounded-md bg-accent-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-400"
            >
              Сохранить
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function ToggleButton({
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
        active ? "bg-accent-500 text-white" : "text-ink-500 hover:bg-ink-900/5 hover:text-ink-700"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
