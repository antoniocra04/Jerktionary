import { Download, History, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  deleteMeeting,
  downloadMeetingMarkdown,
  formatMeetingDate,
  listMeetings,
  type MeetingRecord
} from "@/features/meetings/services/meetings-service";
import { cn } from "@/shared/utils/cn";

/** Header button + modal with past meetings: context, Q&A, transcript, .md export. */
export function MeetingsButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="История встреч"
        title="История встреч"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line text-ink-500 hover:bg-ink-900/5"
      >
        <History className="h-4 w-4" />
      </button>
      {open && <MeetingsModal onClose={() => setOpen(false)} />}
    </>
  );
}

function MeetingsModal({ onClose }: { onClose: () => void }) {
  const [meetings, setMeetings] = useState<MeetingRecord[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    void listMeetings().then(setMeetings);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const selected = meetings?.find((meeting) => meeting.id === selectedId) ?? null;

  const onDelete = async (id: string) => {
    await deleteMeeting(id);
    setMeetings((current) => current?.filter((meeting) => meeting.id !== id) ?? null);
    if (selectedId === id) {
      setSelectedId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/30 p-6"
      onClick={onClose}
    >
      <div
        className="flex h-[min(640px,calc(100vh-4rem))] w-full max-w-3xl overflow-hidden rounded-xl border border-line bg-surface-900 shadow-popover"
        onClick={(event) => event.stopPropagation()}
      >
        <aside className="flex w-64 shrink-0 flex-col border-r border-line">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h3 className="font-display text-[15px] text-ink-900">История встреч</h3>
          </div>
          <div className="flex-1 overflow-auto p-2">
            {meetings === null ? (
              <p className="px-2 py-3 text-sm text-ink-500">Загрузка…</p>
            ) : meetings.length === 0 ? (
              <p className="px-2 py-3 text-sm leading-6 text-ink-500">
                Пока пусто. Встреча сохраняется автоматически, когда вы останавливаете
                прослушивание.
              </p>
            ) : (
              meetings.map((meeting) => (
                <button
                  key={meeting.id}
                  type="button"
                  onClick={() => setSelectedId(meeting.id)}
                  className={cn(
                    "block w-full rounded-md px-3 py-2 text-left hover:bg-ink-900/5",
                    meeting.id === selectedId && "bg-ink-900/5"
                  )}
                >
                  <span className="block text-sm text-ink-900">
                    {formatMeetingDate(meeting.startedAt)}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-ink-500">
                    {meeting.context || `${meeting.qa.length} вопр., транскрипт`}
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-end gap-2 border-b border-line px-4 py-2.5">
            {selected && (
              <>
                <button
                  type="button"
                  onClick={() => downloadMeetingMarkdown(selected)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs text-ink-700 hover:bg-ink-900/5"
                >
                  <Download className="h-3.5 w-3.5" />
                  Экспорт .md
                </button>
                <button
                  type="button"
                  onClick={() => void onDelete(selected.id)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs text-ink-700 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Удалить
                </button>
              </>
            )}
            <button
              type="button"
              aria-label="Закрыть"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-500 hover:bg-ink-900/5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-auto p-5">
            {!selected ? (
              <p className="text-sm text-ink-500">
                Выберите встречу слева, чтобы посмотреть разбор.
              </p>
            ) : (
              <>
                {selected.context && (
                  <p className="rounded-md bg-ink-900/[0.04] px-3 py-2 text-sm leading-relaxed text-ink-600">
                    {selected.context}
                  </p>
                )}

                {selected.qa.length > 0 && (
                  <div className="mt-4 space-y-4">
                    {selected.qa.map((item, index) => (
                      <article key={index} className="rounded-lg border border-line px-4 py-3">
                        <p className="font-display text-[15px] text-ink-900">{item.question}</p>
                        {item.answer && (
                          <p className="mt-2 text-sm leading-relaxed text-ink-700">
                            {item.answer}
                          </p>
                        )}
                        {item.points.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {item.points.map((point, pointIndex) => (
                              <li key={pointIndex} className="flex gap-2 text-sm text-ink-600">
                                <span className="mt-[8px] h-1 w-1 shrink-0 rounded-full bg-accent-400" />
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {item.example && (
                          <p className="mt-2 text-sm italic leading-relaxed text-ink-500">
                            {item.example}
                          </p>
                        )}
                      </article>
                    ))}
                  </div>
                )}

                {selected.transcript && (
                  <div className="mt-5">
                    <h4 className="text-xs font-medium uppercase tracking-wide text-ink-500">
                      Транскрипт
                    </h4>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-600">
                      {selected.transcript}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
