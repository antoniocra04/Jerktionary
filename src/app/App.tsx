import { AlertTriangle, ExternalLink, Settings } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useBackendStatus } from "@/features/backend-status/hooks/useBackendStatus";
import { useAudioStreaming } from "@/features/audio/hooks/useAudioStreaming";
import { useExplanationPrefetch } from "@/features/term-explanation/hooks/useExplanationPrefetch";
import { LiveAnswer } from "@/features/live-answer/components/LiveAnswer";
import { useLiveQuestion } from "@/features/live-answer/hooks/useLiveQuestion";
import { SettingsPopover } from "@/features/settings/components/SettingsPopover";
import { getBackendSwaggerUrl, useSettingsStore } from "@/features/settings/store/settings-store";
import { TranscriptView } from "@/features/transcript/components/TranscriptView";
import { useTranscriptStore } from "@/features/transcript/store/transcript-store";
import { Header } from "@/widgets/Header";
import { MainLayout } from "@/widgets/MainLayout";
import { Sidebar } from "@/widgets/Sidebar";

export function App() {
  const backendStatus = useBackendStatus();
  const audioStreaming = useAudioStreaming();
  const {
    currentText,
    terms,
    isListening,
    connectionStatus,
    microphoneLevel,
    lastEvents,
    lastExplanations,
    backendComponents,
    answeredQuestions,
    microphoneError,
    websocketError
  } = useTranscriptStore();

  const canListen = Boolean(backendStatus.ready?.ready) && !backendStatus.isUnavailable;

  // Warm the explanation cache for on-screen terms so hovering is instant.
  useExplanationPrefetch(terms, currentText);

  // Detect the latest spoken question and keep a history so answers to earlier
  // questions are never overwritten.
  const liveQuestion = useLiveQuestion(currentText);
  useEffect(() => {
    if (liveQuestion) {
      useTranscriptStore.getState().pushQuestion(liveQuestion);
    }
  }, [liveQuestion]);

  // Keep the OS window/app title masked to the user-chosen name.
  const displayName = useSettingsStore((state) => state.displayName);
  useEffect(() => {
    void window.desktopAPI?.setWindowTitle(displayName);
  }, [displayName]);

  const handleToggleListening = async () => {
    try {
      if (isListening) {
        await audioStreaming.stopListening();
        return;
      }

      await audioStreaming.startListening();
    } catch {
      // The concrete user-facing error is already stored by the audio/WebSocket hooks.
    }
  };

  const statusMessage = useMemo(() => {
    if (backendStatus.isUnavailable) {
      return "Backend недоступен";
    }

    if (backendStatus.ready && !backendStatus.ready.ready) {
      return "Backend запущен, но один или несколько обязательных компонентов не готовы";
    }

    return null;
  }, [backendStatus.isUnavailable, backendStatus.ready]);

  return (
    <MainLayout
      header={
        <Header
          backendReady={backendStatus.ready?.ready}
          backendUnavailable={backendStatus.isUnavailable}
          backendLoading={backendStatus.isLoading}
          listening={isListening}
          microphoneLevel={microphoneLevel}
          connectionStatus={connectionStatus}
          disabled={!canListen && !isListening}
          onToggleListening={handleToggleListening}
          onRetryBackend={() => void backendStatus.refetch()}
        />
      }
      sidebar={
        <Sidebar
          terms={terms}
          events={lastEvents}
          explanations={lastExplanations}
          backendReady={backendStatus.ready?.ready}
          components={backendComponents}
        />
      }
    >
      {statusMessage ? (
        <BackendUnavailablePanel
          message={statusMessage}
          error={backendStatus.error instanceof Error ? backendStatus.error.message : undefined}
          onRetry={() => void backendStatus.refetch()}
        />
      ) : (
        <div className="space-y-4">
          {(microphoneError || websocketError) && (
            <div className="rounded-md border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {microphoneError ?? websocketError}
            </div>
          )}
          <LiveAnswer questions={answeredQuestions} context={currentText} />
          <TranscriptView text={currentText} terms={terms} />
        </div>
      )}
    </MainLayout>
  );
}

function BackendUnavailablePanel({
  message,
  error,
  onRetry
}: {
  message: string;
  error?: string;
  onRetry: () => void;
}) {
  const backendHttpUrl = useSettingsStore((state) => state.backendHttpUrl);
  const openSwagger = () => {
    void window.desktopAPI?.openExternal(getBackendSwaggerUrl());
  };

  return (
    <section className="flex min-h-[520px] items-center justify-center rounded-md border border-white/10 bg-surface-900 p-8">
      <div className="max-w-xl">
        <AlertTriangle className="mb-4 h-10 w-10 text-amber-300" />
        <h1 className="text-2xl font-semibold text-slate-50">{message}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Frontend ожидает backend на {backendHttpUrl}. Проверьте адрес в настройках и CORS на
          backend.
        </p>
        {error && (
          <div className="mt-4 rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-100">
            {error}
          </div>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onRetry}
            className="rounded-md bg-accent-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-accent-400"
          >
            Retry
          </button>
          <SettingsPopover>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
            >
              <Settings className="h-4 w-4" />
              Настройки
            </button>
          </SettingsPopover>
          <button
            type="button"
            className="rounded-md border border-white/10 px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
            onClick={() => navigator.clipboard.writeText(backendHttpUrl)}
          >
            Скопировать URL
          </button>
          <button
            type="button"
            onClick={openSwagger}
            className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
          >
            <ExternalLink className="h-4 w-4" />
            Open Swagger
          </button>
        </div>
      </div>
    </section>
  );
}
