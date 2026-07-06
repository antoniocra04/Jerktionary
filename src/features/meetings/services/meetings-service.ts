import type { MeetingQA, MeetingRecord } from "../../../../electron/preload/api";
import { useTranscriptStore } from "@/features/transcript/store/transcript-store";

export type { MeetingQA, MeetingRecord };

const STORAGE_KEY = "meetings.history";
const MAX_MEETINGS = 100;

/** Meetings live in the Electron userData dir; localStorage is the fallback so the
 * app still works in a plain browser during development. */
export async function listMeetings(): Promise<MeetingRecord[]> {
  if (window.desktopAPI) {
    return window.desktopAPI.listMeetings();
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as MeetingRecord[]) : [];
  } catch {
    return [];
  }
}

export async function saveMeeting(record: MeetingRecord): Promise<void> {
  if (window.desktopAPI) {
    return window.desktopAPI.saveMeeting(record);
  }
  const meetings = await listMeetings();
  const rest = meetings.filter((meeting) => meeting.id !== record.id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([record, ...rest].slice(0, MAX_MEETINGS)));
  } catch {
    // Storage full/unavailable — losing history is better than breaking the app.
  }
}

export async function deleteMeeting(id: string): Promise<void> {
  if (window.desktopAPI) {
    return window.desktopAPI.deleteMeeting(id);
  }
  const meetings = await listMeetings();
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(meetings.filter((meeting) => meeting.id !== id))
    );
  } catch {
    // ignore
  }
}

/** Snapshot of the finished meeting from the live stores; null when there is
 * nothing worth saving (no speech and no answered questions). */
export function buildMeetingRecord(): MeetingRecord | null {
  const state = useTranscriptStore.getState();
  const transcript = state.currentText.trim();
  const qa: MeetingQA[] = state.sessionAnswers.map(({ question, answer }) => ({
    question,
    answer: answer.answer,
    points: answer.points,
    example: answer.example
  }));

  if (!transcript && qa.length === 0) {
    return null;
  }

  const startedAt = state.meetingStartedAt ?? Date.now();
  return {
    id: `${startedAt}-${Math.random().toString(36).slice(2, 8)}`,
    startedAt,
    endedAt: Date.now(),
    context: state.meetingContext.trim(),
    transcript,
    qa
  };
}

export function formatMeetingDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function meetingToMarkdown(record: MeetingRecord): string {
  const lines: string[] = [`# Встреча ${formatMeetingDate(record.startedAt)}`, ""];
  if (record.context) {
    lines.push(`**Контекст:** ${record.context}`, "");
  }
  if (record.qa.length > 0) {
    lines.push("## Вопросы и ответы", "");
    record.qa.forEach((item, index) => {
      lines.push(`### ${index + 1}. ${item.question}`, "");
      if (item.answer) {
        lines.push(item.answer, "");
      }
      if (item.points.length > 0) {
        lines.push(...item.points.map((point) => `- ${point}`), "");
      }
      if (item.example) {
        lines.push(`Пример: ${item.example}`, "");
      }
    });
  }
  if (record.transcript) {
    lines.push("## Транскрипт", "", record.transcript, "");
  }
  return lines.join("\n");
}

export function downloadMeetingMarkdown(record: MeetingRecord): void {
  const blob = new Blob([meetingToMarkdown(record)], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `meeting-${new Date(record.startedAt).toISOString().slice(0, 16).replace(/[T:]/g, "-")}.md`;
  anchor.click();
  URL.revokeObjectURL(url);
}
