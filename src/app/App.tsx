import { AlertTriangle, ExternalLink, Settings } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useBackendStatus } from "@/features/backend-status/hooks/useBackendStatus";
import { useAudioStreaming } from "@/features/audio/hooks/useAudioStreaming";
import { useExplanationPrefetch } from "@/features/term-explanation/hooks/useExplanationPrefetch";
import { LiveAnswer } from "@/features/live-answer/components/LiveAnswer";
import { handleFullContextAnswer } from "@/features/live-answer/api/full-context-answer";
import {
  extractForcedQuestion,
  useLiveQuestion
} from "@/features/live-answer/hooks/useLiveQuestion";
import { MeetingContextField } from "@/features/meetings/components/MeetingContextField";
import { SettingsPopover } from "@/features/settings/components/SettingsPopover";
import { getBackendSwaggerUrl, useSettingsStore } from "@/features/settings/store/settings-store";
import { SetupWizard } from "@/features/settings/components/SetupWizard";
import { TranscriptView } from "@/features/transcript/components/TranscriptView";
import { useTranscriptStore } from "@/features/transcript/store/transcript-store";
import { Header } from "@/widgets/Header";
import { MainLayout } from "@/widgets/MainLayout";
import { OverlayView } from "@/widgets/OverlayView";
import { Sidebar } from "@/widgets/Sidebar";

export function App() {
  const backendStatus = useBackendStatus();
  const audioStreaming = useAudioStreaming();
  // Individual selectors: the high-frequency microphoneLevel (≈10/s) is read by the
  // meter itself, so App no longer re-renders the whole tree on every audio tick.
  const currentText = useTranscriptStore((state) => state.currentText);
  const terms = useTranscriptStore((state) => state.terms);
  const isListening = useTranscriptStore((state) => state.isListening);
  const connectionStatus = useTranscriptStore((state) => state.connectionStatus);
  const lastEvents = useTranscriptStore((state) => state.lastEvents);
  const lastExplanations = useTranscriptStore((state) => state.lastExplanations);
  const backendComponents = useTranscriptStore((state) => state.backendComponents);
  const answeredQuestions = useTranscriptStore((state) => state.answeredQuestions);
  const microphoneError = useTranscriptStore((state) => state.microphoneError);
  const websocketError = useTranscriptStore((state) => state.websocketError);

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

  // Compact always-on-top mode for use during a call (Ctrl+Shift+O).
  const [overlay, setOverlay] = useState(false);
  const toggleOverlay = useCallback(() => {
    setOverlay((current) => {
      const next = !current;
      void window.desktopAPI?.setOverlayMode(next);
      return next;
    });
  }, []);

  // Global hotkeys from the main process: they work even while the call app is
  // focused. "Answer now" forces an answer to the last spoken sentence(s), the
  // escape hatch for when automatic question detection misses.
  // Ctrl+Shift+Enter sends the full accumulated transcript as context for the
  // last spoken sentence.
  useEffect(() => {
    const offAnswerNow = window.desktopAPI?.onAnswerNow(() => {
      const store = useTranscriptStore.getState();
      const forced = extractForcedQuestion(store.currentText);
      if (forced) {
        store.pushQuestion(forced);
      }
    });
    const offToggleOverlay = window.desktopAPI?.onToggleOverlay(toggleOverlay);
    const offFullContextAnswer = window.desktopAPI?.onFullContextAnswer(() => {
      void handleFullContextAnswer();
    });
    return () => {
      offAnswerNow?.();
      offToggleOverlay?.();
      offFullContextAnswer?.();
    };
  }, [toggleOverlay]);

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

  const hasCompletedSetup = useSettingsStore((state) => state.hasCompletedSetup);
  const completeSetup = useSettingsStore((state) => state.completeSetup);

  if (!hasCompletedSetup) {
    return <SetupWizard onComplete={completeSetup} />;
  }

  if (overlay) {
    return (
      <>
        <OverlayView
          questions={answeredQuestions}
          context={currentText}
          listening={isListening}
          onExit={toggleOverlay}
        />
      </>
    );
  }

  return (
    <>
      <MainLayout
        header={
          <Header
            backendReady={backendStatus.ready?.ready}
            backendUnavailable={backendStatus.isUnavailable}
            backendLoading={backendStatus.isLoading}
            listening={isListening}
            connectionStatus={connectionStatus}
            disabled={!canListen && !isListening}
            onToggleListening={handleToggleListening}
            onToggleOverlay={toggleOverlay}
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
              <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
                {microphoneError ?? websocketError}
              </div>
            )}
            <MeetingContextField />
            <LiveAnswer questions={answeredQuestions} context={currentText} />
            <TranscriptView text={currentText} terms={terms} />
          </div>
        )}
      </MainLayout>
    </>
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
    <section className="flex min-h-[520px] items-center justify-center rounded-md border border-line bg-surface-900 p-8">
      <div className="max-w-xl">
        <AlertTriangle className="mb-4 h-10 w-10 text-amber-600" />
        <h1 className="font-display text-2xl text-ink-900">{message}</h1>
        <p className="mt-3 text-sm leading-6 text-ink-600">
          Frontend ожидает backend на {backendHttpUrl}. Проверьте адрес в настройках и CORS на
          backend.
        </p>
        {error && (
          <div className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onRetry}
            className="rounded-md bg-accent-500 px-3 py-2 text-sm font-medium text-white hover:bg-accent-400"
          >
            Retry
          </button>
          <SettingsPopover>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm text-ink-700 hover:bg-ink-900/5"
            >
              <Settings className="h-4 w-4" />
              Настройки
            </button>
          </SettingsPopover>
          <button
            type="button"
            className="rounded-md border border-line px-3 py-2 text-sm text-ink-700 hover:bg-ink-900/5"
            onClick={() => navigator.clipboard.writeText(backendHttpUrl)}
          >
            Скопировать URL
          </button>
          <button
            type="button"
            onClick={openSwagger}
            className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm text-ink-700 hover:bg-ink-900/5"
          >
            <ExternalLink className="h-4 w-4" />
            Open Swagger
          </button>
        </div>
      </div>
    </section>
  );
}
