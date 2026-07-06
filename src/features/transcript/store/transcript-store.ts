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

// Filler words Whisper frequently prepends mid-sentence ("А что такое...",
// "Ну как..."). Stripping the leading one collapses these paraphrases onto the
// canonical question so a re-decode no longer spawns a duplicate answer card.
const FILLER_WORD_RE = /^(?:а|ну|итак|так|вот|значит|короче)\s+/i;

/** Canonical key for comparing questions: lowercase, drop punctuation, collapse
 * spaces, and strip a leading filler word. The store is the single dedup point —
 * useLiveQuestion keeps its own lighter key for its local "current" tracking, but
 * everything that lands here is filtered by this canonical form so Whisper re-decodes
 * ("Что такое X?" → "А что такое X?") don't create duplicate answers. */
function questionKey(question: string): string {
  const normalized = question
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  // Loop in case two fillers stack ("ну а что...").
  let stripped = normalized;
  for (let i = 0; i < 2 && FILLER_WORD_RE.test(stripped); i += 1) {
    stripped = stripped.replace(FILLER_WORD_RE, "");
  }
  return stripped.trim();
}

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
      const key = questionKey(question);
      // The question detector regularly re-finds an older question (the last "?"
      // sentence stays in the transcript) and Whisper keeps re-decoding the live
      // tail into slightly different paraphrases ("Что такое X?" → "А что такое X?").
      // Comparing by the canonical key collapses those onto one entry, so a known
      // question keeps its slot and its already-started answer instead of spawning a
      // duplicate card + a second LLM stream.
      if (state.answeredQuestions.some((item) => questionKey(item) === key)) {
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
