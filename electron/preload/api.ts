export type MeetingQA = {
  question: string;
  answer: string;
  points: string[];
  example: string;
};

export type MeetingRecord = {
  id: string;
  startedAt: number;
  endedAt: number;
  /** Free-form per-meeting context the user typed before the meeting. */
  context: string;
  transcript: string;
  qa: MeetingQA[];
};

export type DesktopApi = {
  getAppVersion: () => Promise<string>;
  getPlatform: () => Promise<NodeJS.Platform>;
  openExternal: (url: string) => Promise<void>;
  setContentProtection: (enabled: boolean) => Promise<void>;
  setWindowTitle: (title: string) => Promise<void>;
  setOverlayMode: (enabled: boolean) => Promise<void>;
  /** Request native macOS microphone or screen recording permission. */
  requestMediaAccess: (hint: "microphone" | "screen") => Promise<boolean>;
  /** Subscribe to the global "answer now" hotkey; returns an unsubscribe. */
  onAnswerNow: (listener: () => void) => () => void;
  /** Subscribe to the global overlay-toggle hotkey; returns an unsubscribe. */
  onToggleOverlay: (listener: () => void) => () => void;
  listMeetings: () => Promise<MeetingRecord[]>;
  saveMeeting: (record: MeetingRecord) => Promise<void>;
  deleteMeeting: (id: string) => Promise<void>;
};
