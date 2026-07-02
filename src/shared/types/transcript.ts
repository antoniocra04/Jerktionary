import type { TranscriptTerm } from "./term";

export type WsConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

export type TranscriptUpdateEvent = {
  type: "transcript_update";
  text: string;
  is_final: boolean;
  terms: TranscriptTerm[];
};

export type TermsUpdateEvent = {
  type: "terms_update";
  items: TranscriptTerm[];
};

export type BackendErrorEvent = {
  type: "error";
  code: "INVALID_AUDIO_CHUNK" | string;
};

export type BackendWsEvent = TranscriptUpdateEvent | TermsUpdateEvent | BackendErrorEvent;

export type TranscriptEvent = BackendWsEvent & {
  receivedAt: number;
};

export type HighlightSegment =
  | {
      kind: "text";
      text: string;
      start: number;
      end: number;
    }
  | {
      kind: "term";
      text: string;
      start: number;
      end: number;
      term: TranscriptTerm;
    };
