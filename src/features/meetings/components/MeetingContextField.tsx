import { NotebookPen } from "lucide-react";
import { useTranscriptStore } from "@/features/transcript/store/transcript-store";

/** Free-form context of the current meeting (company, position, topic). Kept per
 * meeting: it is saved into the meeting record and passed to the LLM with every
 * answer, alongside the persistent "about me" profile from settings. */
export function MeetingContextField() {
  const meetingContext = useTranscriptStore((state) => state.meetingContext);

  return (
    <label className="flex items-start gap-2.5 rounded-xl border border-line bg-surface-900 px-4 py-3">
      <NotebookPen className="mt-1 h-4 w-4 shrink-0 text-ink-400" />
      <span className="flex-1">
        <span className="text-xs text-ink-500">Контекст этой встречи</span>
        <textarea
          value={meetingContext}
          onChange={(event) =>
            useTranscriptStore.getState().setMeetingContext(event.target.value)
          }
          rows={meetingContext ? 2 : 1}
          maxLength={2000}
          placeholder="Например: собеседование на middle frontend в X, стек React + TS, говорим про прошлый проект"
          className="mt-1 w-full resize-y rounded-md border border-transparent bg-transparent text-sm leading-5 text-ink-900 outline-none placeholder:text-ink-400 focus:border-line"
        />
      </span>
    </label>
  );
}
