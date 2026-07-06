import { create } from "zustand";
import type { LiveAnswer } from "@/shared/types/answer";
import type { BackendComponent } from "@/shared/types/backend";
import type { TranscriptEvent, WsConnectionStatus } from "@/shared/types/transcript";
import type { TermExplanation, TranscriptTerm } from "@/shared/types/term";

export type LastExplanation = {
  term: string;
  explanation: TermExplanation;
  loadedAt: number;
};

export type SessionAnswer = {
  question: string;
  answer: LiveAnswer;
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
  answerStreaming: number;
  /** Free-form context of the current meeting; a new meeting starts fresh. */
  meetingContext: string;
  /** Completed answers of the current meeting, in the order questions arrived. */
  sessionAnswers: SessionAnswer[];
  meetingStartedAt: number | null;
  microphoneError: string | null;
  websocketError: string | null;
  setTranscript: (text: string, terms: TranscriptTerm[]) => void;
  pushQuestion: (question: string) => void;
  setMeetingContext: (context: string) => void;
  recordAnswer: (question: string, answer: LiveAnswer) => void;
  beginAnswerStreaming: () => void;
  endAnswerStreaming: () => void;
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
  answerStreaming: 0,
  meetingContext: "",
  sessionAnswers: [],
  meetingStartedAt: null,
  microphoneError: null,
  websocketError: null,
  setTranscript: (currentText, terms) => set({ currentText, terms }),
  setMeetingContext: (meetingContext) => set({ meetingContext }),
  recordAnswer: (question, answer) =>
    set((state) => {
      const existing = state.sessionAnswers.findIndex((item) => item.question === question);
      if (existing >= 0) {
        const sessionAnswers = [...state.sessionAnswers];
        sessionAnswers[existing] = { question, answer };
        return { sessionAnswers };
      }
      return { sessionAnswers: [...state.sessionAnswers, { question, answer }] };
    }),
  beginAnswerStreaming: () => set((state) => ({ answerStreaming: state.answerStreaming + 1 })),
  endAnswerStreaming: () =>
    set((state) => ({ answerStreaming: Math.max(0, state.answerStreaming - 1) })),
  pushQuestion: (question) =>
    set((state) => {
      const key = question.trim().toLowerCase();
      // The question detector regularly re-finds an older question (the last "?"
      // sentence stays in the transcript). Re-ordering here would remount the
      // answer card and restart generation, so known questions keep their slot.
      if (state.answeredQuestions.some((item) => item.trim().toLowerCase() === key)) {
        return state;
      }
      return { answeredQuestions: [question, ...state.answeredQuestions].slice(0, 8) };
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
    // meetingContext survives on purpose: the user fills it in before pressing
    // "Слушать", and resetSession runs exactly at that moment.
    set({
      currentText: "",
      terms: [],
      lastEvents: [],
      answeredQuestions: [],
      sessionAnswers: [],
      meetingStartedAt: Date.now(),
      microphoneLevel: 0,
      websocketError: null,
      microphoneError: null
    })
}));
