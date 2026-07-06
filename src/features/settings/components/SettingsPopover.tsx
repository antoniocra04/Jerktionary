import * as Popover from "@radix-ui/react-popover";
import { useQueryClient } from "@tanstack/react-query";
import { Cpu, KeyRound, Mic, Volume2 } from "lucide-react";
import type { PropsWithChildren, ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  ASR_SERVICE_PRESETS,
  DEFAULT_DISPLAY_NAME,
  LLM_SERVICE_PRESETS,
  type AsrService,
  type AudioSource,
  type LlmService,
  type ModelProvider,
  useSettingsStore
} from "@/features/settings/store/settings-store";
import { cn } from "@/shared/utils/cn";

const inputClass =
  "mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink-900 outline-none placeholder:text-ink-400 focus:border-accent-500/60";

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

  const [asrProvider, setAsrProvider] = useState<ModelProvider>(store.whisperProvider);
  const [asrService, setAsrService] = useState<AsrService>(store.whisperService);
  const [asrKey, setAsrKey] = useState(store.whisperApiKey);
  const [asrModel, setAsrModel] = useState(store.whisperModel);
  const [asrBaseUrl, setAsrBaseUrl] = useState(store.whisperBaseUrl);

  const [llmProvider, setLlmProvider] = useState<ModelProvider>(store.llmProvider);
  const [llmService, setLlmService] = useState<LlmService>(store.llmService);
  const [llmKey, setLlmKey] = useState(store.llmApiKey);
  const [llmModel, setLlmModel] = useState(store.llmModel);
  const [llmBaseUrl, setLlmBaseUrl] = useState(store.llmBaseUrl);

  // Device labels are only available once mic permission has been granted at
  // least once; before that the list stays generic ("Микрофон 1").
  useEffect(() => {
    if (!open || source !== "microphone" || !navigator.mediaDevices?.enumerateDevices) {
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
  }, [open, source]);

  const onOpenChange = (next: boolean) => {
    if (next) {
      setUrl(store.backendHttpUrl);
      setName(store.displayName);
      setAbout(store.aboutMe);
      setSource(store.audioSource);
      setDeviceId(store.audioInputDeviceId);
      setAsrProvider(store.whisperProvider);
      setAsrService(store.whisperService);
      setAsrKey(store.whisperApiKey);
      setAsrModel(store.whisperModel);
      setAsrBaseUrl(store.whisperBaseUrl);
      setLlmProvider(store.llmProvider);
      setLlmService(store.llmService);
      setLlmKey(store.llmApiKey);
      setLlmModel(store.llmModel);
      setLlmBaseUrl(store.llmBaseUrl);
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
    state.setModelSettings({
      whisperProvider: asrProvider,
      whisperService: asrService,
      whisperApiKey: asrKey,
      whisperModel: asrModel,
      whisperBaseUrl: asrBaseUrl,
      llmProvider,
      llmService,
      llmApiKey: llmKey,
      llmModel,
      llmBaseUrl
    });
    void window.desktopAPI?.setWindowTitle(name.trim() || DEFAULT_DISPLAY_NAME);
    void queryClient.invalidateQueries({ queryKey: ["backend"] });
    void queryClient.invalidateQueries({ queryKey: ["term-explanation"] });
    void queryClient.invalidateQueries({ queryKey: ["live-answer"] });
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

          <ProviderSection
            title="Распознавание речи"
            localLabel="Локальный Whisper"
            provider={asrProvider}
            onProviderChange={setAsrProvider}
            service={asrService}
            services={ASR_SERVICE_PRESETS}
            onServiceChange={(value) => setAsrService(value as AsrService)}
            apiKey={asrKey}
            onApiKeyChange={setAsrKey}
            model={asrModel}
            onModelChange={setAsrModel}
            baseUrl={asrBaseUrl}
            onBaseUrlChange={setAsrBaseUrl}
          />

          <ProviderSection
            title="Модель ответов (LLM)"
            localLabel="Локальная (Ollama)"
            provider={llmProvider}
            onProviderChange={setLlmProvider}
            service={llmService}
            services={LLM_SERVICE_PRESETS}
            onServiceChange={(value) => setLlmService(value as LlmService)}
            apiKey={llmKey}
            onApiKeyChange={setLlmKey}
            model={llmModel}
            onModelChange={setLlmModel}
            baseUrl={llmBaseUrl}
            onBaseUrlChange={setLlmBaseUrl}
          />

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

function ProviderSection({
  title,
  localLabel,
  provider,
  onProviderChange,
  service,
  services,
  onServiceChange,
  apiKey,
  onApiKeyChange,
  model,
  onModelChange,
  baseUrl,
  onBaseUrlChange
}: {
  title: string;
  localLabel: string;
  provider: ModelProvider;
  onProviderChange: (provider: ModelProvider) => void;
  service: string;
  services: Record<string, { label: string; baseUrl: string; model: string }>;
  onServiceChange: (service: string) => void;
  apiKey: string;
  onApiKeyChange: (value: string) => void;
  model: string;
  onModelChange: (value: string) => void;
  baseUrl: string;
  onBaseUrlChange: (value: string) => void;
}) {
  const preset = services[service];

  return (
    <div className="mt-4 rounded-lg border border-line bg-surface-850/60 p-3">
      <span className="text-xs font-medium text-ink-700">{title}</span>
      <div className="mt-2 grid grid-cols-2 rounded-md border border-line bg-surface-850 p-1">
        <ToggleButton
          active={provider === "local"}
          icon={<Cpu className="h-4 w-4" />}
          label={localLabel}
          onClick={() => onProviderChange("local")}
        />
        <ToggleButton
          active={provider === "api"}
          icon={<KeyRound className="h-4 w-4" />}
          label="Через API"
          onClick={() => onProviderChange("api")}
        />
      </div>

      {provider === "api" ? (
        <div className="mt-2 space-y-2">
          <select
            value={service}
            onChange={(event) => onServiceChange(event.target.value)}
            className={inputClass}
          >
            {Object.entries(services).map(([key, item]) => (
              <option key={key} value={key}>
                {item.label}
              </option>
            ))}
          </select>
          <input
            type="password"
            value={apiKey}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            onChange={(event) => onApiKeyChange(event.target.value)}
            placeholder="API key"
            className={inputClass}
          />
          <input
            type="text"
            value={model}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            onChange={(event) => onModelChange(event.target.value)}
            placeholder={preset?.model ? `Модель: ${preset.model}` : "Модель"}
            className={inputClass}
          />
          {service === "custom" && (
            <input
              type="text"
              value={baseUrl}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              onChange={(event) => onBaseUrlChange(event.target.value)}
              placeholder="Base URL, например http://localhost:8080/v1"
              className={inputClass}
            />
          )}
          <span className={hintClass}>
            Ключ хранится на этом компьютере и отправляется только вашему backend, который
            обращается к провайдеру напрямую.
          </span>
        </div>
      ) : (
        <span className={hintClass}>
          Использует модель, запущенную вместе с backend. Если локальная модель выключена на
          backend, переключитесь на API.
        </span>
      )}
    </div>
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
