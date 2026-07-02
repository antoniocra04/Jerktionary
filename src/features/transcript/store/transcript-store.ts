import { create } from "zustand";
import type { BackendComponent } from "@/shared/types/backend";
import type { TranscriptEvent, WsConnectionStatus } from "@/shared/types/transcript";
import type { TermExplanation, TranscriptTerm } from "@/shared/types/term";

export type LastExplanation = {
  term: string;
  explanation: TermExplanation;
  loadedAt: number;
};

type TranscriptState = {
  currentText: string;
  terms: TranscriptTerm[];
  connectionStatus: WsConnectionStatus;
  isListening: boolean;
  lastEvents: TranscriptEvent[];
  microphoneLevel: number;
  backendReady: boolean;
  backendComponents: BackendComponent[];
  lastExplanations: LastExplanation[];
  answeredQuestions: string[];
  microphoneError: string | null;
  websocketError: string | null;
  setTranscript: (text: string, terms: TranscriptTerm[]) => void;
  pushQuestion: (question: string) => void;
  setTerms: (terms: TranscriptTerm[]) => void;
  setConnectionStatus: (status: WsConnectionStatus) => void;
  setListening: (isListening: boolean) => void;
  pushEvent: (event: TranscriptEvent) => void;
  setMicrophoneLevel: (level: number) => void;
  setBackendStatus: (ready: boolean, components: BackendComponent[]) => void;
  addLastExplanation: (term: string, explanation: TermExplanation) => void;
  setMicrophoneError: (message: string | null) => void;
  setWebsocketError: (message: string | null) => void;
  resetSession: () => void;
};

export const useTranscriptStore = create<TranscriptState>((set) => ({
  currentText: "",
  terms: [],
  connectionStatus: "disconnected",
  isListening: false,
  lastEvents: [],
  microphoneLevel: 0,
  backendReady: false,
  backendComponents: [],
  lastExplanations: [],
  answeredQuestions: [],
  microphoneError: null,
  websocketError: null,
  setTranscript: (currentText, terms) => set({ currentText, terms }),
  pushQuestion: (question) =>
    set((state) => {
      const key = question.trim().toLowerCase();
      const rest = state.answeredQuestions.filter((item) => item.trim().toLowerCase() !== key);
      return { answeredQuestions: [question, ...rest].slice(0, 8) };
    }),
  setTerms: (terms) => set({ terms }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setListening: (isListening) => set({ isListening }),
  pushEvent: (event) =>
    set((state) => ({
      lastEvents: [event, ...state.lastEvents].slice(0, 20)
    })),
  setMicrophoneLevel: (microphoneLevel) => set({ microphoneLevel }),
  setBackendStatus: (backendReady, backendComponents) =>
    set({ backendReady, backendComponents }),
  addLastExplanation: (term, explanation) =>
    set((state) => ({
      lastExplanations: [
        { term, explanation, loadedAt: Date.now() },
        ...state.lastExplanations.filter((item) => item.term !== term)
      ].slice(0, 6)
    })),
  setMicrophoneError: (microphoneError) => set({ microphoneError }),
  setWebsocketError: (websocketError) => set({ websocketError }),
  resetSession: () =>
    set({
      currentText: "",
      terms: [],
      lastEvents: [],
      answeredQuestions: [],
      microphoneLevel: 0,
      websocketError: null,
      microphoneError: null
    })
}));
