import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { app } from "electron";
import type { MeetingRecord } from "../preload/api";

const MAX_MEETINGS = 100;

function storePath(): string {
  return join(app.getPath("userData"), "meetings.json");
}

export async function listMeetings(): Promise<MeetingRecord[]> {
  try {
    const raw = await readFile(storePath(), "utf8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MeetingRecord[]) : [];
  } catch {
    return [];
  }
}

async function persist(meetings: MeetingRecord[]): Promise<void> {
  const path = storePath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(meetings, null, 2), "utf8");
}

export async function saveMeeting(record: MeetingRecord): Promise<void> {
  const meetings = await listMeetings();
  const rest = meetings.filter((meeting) => meeting.id !== record.id);
  await persist([record, ...rest].slice(0, MAX_MEETINGS));
}

export async function deleteMeeting(id: string): Promise<void> {
  const meetings = await listMeetings();
  await persist(meetings.filter((meeting) => meeting.id !== id));
}
