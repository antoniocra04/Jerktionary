import * as Popover from "@radix-ui/react-popover";
import type { PropsWithChildren } from "react";
import { useEffect, useState } from "react";
import type { TranscriptTerm } from "@/shared/types/term";
import { ExplanationCard } from "./ExplanationCard";
import { getExplanationErrorMessage } from "@/features/term-explanation/hooks/useTermExplanation";
import { useLiveExplanation } from "@/features/term-explanation/hooks/useLiveExplanation";
import { useTranscriptStore } from "@/features/transcript/store/transcript-store";

type TermPopoverProps = PropsWithChildren<{
  term: TranscriptTerm;
  context: string;
}>;

export function TermPopover({ term, context, children }: TermPopoverProps) {
  const [open, setOpen] = useState(false);
  const explanation = useLiveExplanation(open ? term.normalized || term.text : null, context);

  useEffect(() => {
    if (explanation.data && !explanation.streaming) {
      useTranscriptStore
        .getState()
        .addLastExplanation(term.normalized || term.text, explanation.data);
    }
  }, [explanation.data, explanation.streaming, term.normalized, term.text]);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        asChild
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {children}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          align="start"
          sideOffset={8}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          className="z-50 outline-none"
        >
          <ExplanationCard
            explanation={explanation.data}
            loading={explanation.streaming && !explanation.data}
            streaming={explanation.streaming}
            error={explanation.error ? getExplanationErrorMessage(explanation.error) : undefined}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
