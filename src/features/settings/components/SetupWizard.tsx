import { ArrowLeft, ArrowRight, Check, Mic, Settings, Sparkles, Volume2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSettingsStore, type AudioSource } from "@/features/settings/store/settings-store";
import { backendApi } from "@/shared/api/backend-api";
import { cn } from "@/shared/utils/cn";

const TOTAL_STEPS = 4;

type HealthStatus = "idle" | "checking" | "ok" | "error";

export function SetupWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const store = useSettingsStore();

  const [url, setUrl] = useState(store.backendHttpUrl);
  const [healthStatus, setHealthStatus] = useState<HealthStatus>("idle");
  const [healthError, setHealthError] = useState("");

  const [audioSource, setAudioSource] = useState<AudioSource>(store.audioSource);
  const [deviceId, setDeviceId] = useState(store.audioInputDeviceId);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    if (step !== 2) {
      return;
    }
    let cancelled = false;
    void navigator.mediaDevices?.enumerateDevices().then((all) => {
      if (!cancelled) {
        setDevices(all.filter((d) => d.kind === "audioinput"));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [step]);

  const checkBackend = async () => {
    const normalized = url.trim().replace(/\/+$/, "");
    setUrl(normalized);
    store.setBackendHttpUrl(normalized);
    setHealthStatus("checking");
    setHealthError("");
    try {
      await backendApi.health();
      setHealthStatus("ok");
    } catch (err) {
      setHealthStatus("error");
      setHealthError(err instanceof Error ? err.message : "Неизвестная ошибка");
    }
  };

  const finish = () => {
    store.setAudioSource(audioSource);
    store.setAudioInputDeviceId(deviceId);
    store.completeSetup();
    onComplete();
  };

  const next = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
    }
  };
  const prev = () => step > 0 && setStep((s) => s - 1);

  return (
    <div className="flex h-screen items-center justify-center bg-surface-950 p-6">
      <div className="w-full max-w-md rounded-xl border border-line bg-surface-900 p-6 shadow-popover">
        {step > 0 && (
          <div className="mb-6 flex items-center gap-2">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full",
                  i <= step ? "bg-accent-500" : "bg-ink-300"
                )}
              />
            ))}
          </div>
        )}

        {step === 0 && <WelcomeStep onNext={next} />}
        {step === 1 && (
          <BackendStep
            url={url}
            onUrlChange={setUrl}
            onCheck={checkBackend}
            healthStatus={healthStatus}
            healthError={healthError}
            onNext={next}
            onPrev={prev}
            canNext={healthStatus === "ok"}
          />
        )}
        {step === 2 && (
          <AudioStep
            source={audioSource}
            onSourceChange={setAudioSource}
            deviceId={deviceId}
            onDeviceChange={setDeviceId}
            devices={devices}
            onNext={next}
            onPrev={prev}
          />
        )}
        {step === 3 && <DoneStep onStart={finish} onPrev={prev} />}
      </div>
    </div>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-accent-500">
        <Sparkles className="h-8 w-8 text-white" />
      </div>
      <h1 className="font-display text-2xl text-ink-900">Jerktionary</h1>
      <p className="mt-3 text-sm leading-6 text-ink-600">
        Ассистент для встреч и собеседований: слушает разговор в реальном времени,
        объясняет профессиональные термины и отвечает на вопросы вслух — не отвлекаясь от
        обсуждения.
      </p>
      <p className="mt-2 text-sm leading-6 text-ink-500">
        Давайте настроим всё за несколько шагов.
      </p>
      <button
        type="button"
        onClick={onNext}
        className="mt-6 inline-flex items-center gap-2 rounded-md bg-accent-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-400"
      >
        Далее
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function BackendStep({
  url,
  onUrlChange,
  onCheck,
  healthStatus,
  healthError,
  onNext,
  onPrev,
  canNext
}: {
  url: string;
  onUrlChange: (value: string) => void;
  onCheck: () => void;
  healthStatus: HealthStatus;
  healthError: string;
  onNext: () => void;
  onPrev: () => void;
  canNext: boolean;
}) {
  return (
    <div>
      <h2 className="font-display text-lg text-ink-900">Подключение к бекенду</h2>
      <p className="mt-1 text-sm text-ink-600">
        Укажите адрес запущенного бекенда Jerktionary.
      </p>

      <label className="mt-4 block">
        <span className="text-xs text-ink-500">URL бекенда</span>
        <div className="mt-1 flex gap-2">
          <input
            type="text"
            value={url}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            onChange={(e) => onUrlChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onCheck()}
            placeholder="http://127.0.0.1:8000"
            className="flex-1 rounded-md border border-line bg-surface-900 px-3 py-2 text-sm text-ink-900 outline-none placeholder:text-ink-400 focus:border-accent-500/60"
          />
          <button
            type="button"
            onClick={onCheck}
            disabled={healthStatus === "checking" || !url.trim()}
            className="rounded-md border border-line px-4 py-2 text-sm text-ink-700 hover:bg-ink-900/5 disabled:opacity-50"
          >
            {healthStatus === "checking" ? "..." : "Проверить"}
          </button>
        </div>
      </label>

      {healthStatus === "ok" && (
        <div className="mt-3 flex items-center gap-2 text-sm text-emerald-600">
          <Check className="h-4 w-4" />
          Бекенд доступен
        </div>
      )}
      {healthStatus === "error" && (
        <div className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {healthError}
        </div>
      )}

      <div className="mt-6 flex justify-between">
        <button
          type="button"
          onClick={onPrev}
          className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-sm text-ink-600 hover:bg-ink-900/5"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!canNext}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent-500 px-4 py-2 text-sm font-medium text-white hover:bg-accent-400 disabled:opacity-50"
        >
          Далее
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function AudioStep({
  source,
  onSourceChange,
  deviceId,
  onDeviceChange,
  devices,
  onNext,
  onPrev
}: {
  source: AudioSource;
  onSourceChange: (source: AudioSource) => void;
  deviceId: string;
  onDeviceChange: (deviceId: string) => void;
  devices: MediaDeviceInfo[];
  onNext: () => void;
  onPrev: () => void;
}) {
  const [micLevel, setMicLevel] = useState(0);
  const [testing, setTesting] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  const stopMicTest = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setTesting(false);
    setMicLevel(0);
  }, []);

  const startMicTest = useCallback(async () => {
    stopMicTest();
    try {
      const constraints: MediaStreamConstraints = {
        audio: deviceId ? { deviceId: { exact: deviceId } } : true
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setTesting(true);

      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setMicLevel(Math.min(avg / 128, 1));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      setTesting(false);
    }
  }, [deviceId, stopMicTest]);

  useEffect(() => stopMicTest, [stopMicTest]);

  return (
    <div>
      <h2 className="font-display text-lg text-ink-900">Настройка звука</h2>
      <p className="mt-1 text-sm text-ink-600">
        Выберите источник и устройство ввода. Проверьте уровень сигнала.
      </p>

      <div className="mt-4">
        <span className="text-xs text-ink-500">Источник звука</span>
        <div className="mt-2 grid grid-cols-2 rounded-md border border-line bg-surface-850 p-1">
          <button
            type="button"
            onClick={() => {
              onSourceChange("microphone");
              stopMicTest();
            }}
            className={cn(
              "inline-flex min-h-8 items-center justify-center gap-2 rounded px-2 text-xs font-medium transition",
              source === "microphone"
                ? "bg-accent-500 text-white"
                : "text-ink-500 hover:bg-ink-900/5 hover:text-ink-700"
            )}
          >
            <Mic className="h-4 w-4" />
            Микрофон
          </button>
          <button
            type="button"
            onClick={() => {
              onSourceChange("system");
              stopMicTest();
            }}
            className={cn(
              "inline-flex min-h-8 items-center justify-center gap-2 rounded px-2 text-xs font-medium transition",
              source === "system"
                ? "bg-accent-500 text-white"
                : "text-ink-500 hover:bg-ink-900/5 hover:text-ink-700"
            )}
          >
            <Volume2 className="h-4 w-4" />
            Система
          </button>
        </div>
      </div>

      {source === "microphone" && devices.length > 0 && (
        <label className="mt-4 block">
          <span className="text-xs text-ink-500">Микрофон</span>
          <select
            value={deviceId}
            onChange={(e) => {
              onDeviceChange(e.target.value);
              stopMicTest();
            }}
            className="mt-1 w-full rounded-md border border-line bg-surface-900 px-3 py-2 text-sm text-ink-900 outline-none focus:border-accent-500/60"
          >
            <option value="">Микрофон по умолчанию</option>
            {devices.map((d, i) => (
              <option key={d.deviceId || i} value={d.deviceId}>
                {d.label || `Микрофон ${i + 1}`}
              </option>
            ))}
          </select>
        </label>
      )}

      {source === "microphone" && (
        <div className="mt-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={testing ? stopMicTest : startMicTest}
              className={cn(
                "rounded-md border px-3 py-1.5 text-xs font-medium",
                testing
                  ? "border-red-300 text-red-700 hover:bg-red-50"
                  : "border-line text-ink-600 hover:bg-ink-900/5"
              )}
            >
              {testing ? "Остановить" : "Проверить микрофон"}
            </button>
            {testing && (
              <div className="flex flex-1 items-center gap-0.5">
                {Array.from({ length: 12 }).map((_, i) => {
                  const threshold = (i + 1) / 12;
                  return (
                    <span
                      key={i}
                      className={cn(
                        "h-2 flex-1 rounded-sm transition-colors",
                        micLevel >= threshold ? "bg-accent-500" : "bg-ink-900/10"
                      )}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-between">
        <button
          type="button"
          onClick={onPrev}
          className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-sm text-ink-600 hover:bg-ink-900/5"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад
        </button>
        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent-500 px-4 py-2 text-sm font-medium text-white hover:bg-accent-400"
        >
          Далее
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function DoneStep({ onStart, onPrev }: { onStart: () => void; onPrev: () => void }) {
  return (
    <div>
      <h2 className="font-display text-lg text-ink-900">Всё готово</h2>
      <p className="mt-1 text-sm text-ink-600">
        Jerktionary настроен. Запомните горячие клавиши:
      </p>

      <div className="mt-4 space-y-3">
        <HotkeyRow keys="Ctrl+Shift+Space" label="Ответить на последнюю фразу" />
        <HotkeyRow keys="Ctrl+Shift+O" label="Компактный режим поверх окон" />
        <HotkeyRow keys="← →" label="Переключение между вопросами" />
      </div>

      <p className="mt-4 text-sm text-ink-500">
        Настройки всегда можно изменить через иконку{" "}
        <Settings className="inline h-3.5 w-3.5" /> в заголовке.
      </p>

      <div className="mt-6 flex justify-between">
        <button
          type="button"
          onClick={onPrev}
          className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-sm text-ink-600 hover:bg-ink-900/5"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад
        </button>
        <button
          type="button"
          onClick={onStart}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent-500 px-4 py-2 text-sm font-medium text-white hover:bg-accent-400"
        >
          Начать
          <Check className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function HotkeyRow({ keys, label }: { keys: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <kbd className="rounded border border-line bg-surface-850 px-2 py-0.5 font-mono text-xs text-ink-700">
        {keys}
      </kbd>
      <span className="text-sm text-ink-600">{label}</span>
    </div>
  );
}
