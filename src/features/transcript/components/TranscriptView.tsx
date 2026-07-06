import { ArrowDown, MessageSquareText } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { TranscriptTerm } from "@/shared/types/term";
import { TranscriptLine } from "./TranscriptLine";

type TranscriptViewProps = {
  text: string;
  terms: TranscriptTerm[];
};

const STICK_THRESHOLD_PX = 48;

export function TranscriptView({ text, terms }: TranscriptViewProps) {
  const scrollRef = useRef<HTMLElement | null>(null);
  // Follow the live tail until the user scrolls up or hovers to read/copy;
  // then hold position and offer a "jump to latest" affordance instead.
  const [stick, setStick] = useState(true);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const node = scrollRef.current;
    if (node && stick && !hovered) {
      node.scrollTop = node.scrollHeight;
    }
  }, [text, stick, hovered]);

  const onScroll = () => {
    const node = scrollRef.current;
    if (!node) {
      return;
    }
    setStick(node.scrollHeight - node.scrollTop - node.clientHeight < STICK_THRESHOLD_PX);
  };

  const jumpToLatest = () => {
    const node = scrollRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
    setStick(true);
  };

  if (!text) {
    return (
      <section className="flex h-full min-h-[420px] items-center justify-center rounded-md border border-dashed border-line bg-surface-900">
        <div className="max-w-sm text-center">
          <MessageSquareText className="mx-auto mb-3 h-9 w-9 text-ink-300" />
          <h2 className="font-display text-lg text-ink-700">Транскрипт пока пуст</h2>
          <p className="mt-2 text-sm leading-6 text-ink-500">
            Нажмите «Слушать», чтобы начать потоковую расшифровку с микрофона.
          </p>
        </div>
      </section>
    );
  }

  return (
    <div className="relative h-full min-h-[420px]">
      <section
        ref={scrollRef}
        onScroll={onScroll}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="h-full overflow-auto rounded-md border border-line bg-surface-900 p-6"
      >
        <TranscriptLine text={text} terms={terms} />
      </section>
      {!stick && (
        <button
          type="button"
          onClick={jumpToLatest}
          className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-900 px-3 py-1.5 text-xs text-ink-700 shadow-popover hover:bg-surface-850"
        >
          <ArrowDown className="h-3.5 w-3.5" />
          К последнему
        </button>
      )}
    </div>
  );
}
