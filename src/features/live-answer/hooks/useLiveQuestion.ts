import { useEffect, useState } from "react";

const INTERROGATIVE =
  /^(что такое|что это|что значит|как|почему|зачем|где|когда|кто|чем|в ч[её]м|чем отлич|расскажи|объясни|приведи|дай определение|опиши)/i;

/** Extracts the most recent question from the running transcript. */
export function extractLatestQuestion(text: string): string | null {
  if (!text.trim()) {
    return null;
  }

  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);

  for (let index = sentences.length - 1; index >= 0; index -= 1) {
    if (sentences[index].endsWith("?")) {
      return sentences[index];
    }
  }

  // No explicit question mark — allow the last sentence if it's an imperative ask
  // ("расскажи про X", "объясни Y").
  const last = sentences[sentences.length - 1];
  if (last && INTERROGATIVE.test(last)) {
    return last.replace(/[.…]+$/, "");
  }
  return null;
}

/** Loose key for comparing questions, so trivial re-decodes don't look "new". */
function questionKey(question: string): string {
  return question
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Watches the transcript and returns the latest detected question, but only once it
 * has *settled* — i.e. the transcript stopped changing for `stableMs`. It also
 * ignores changes that are trivial re-decodes of the same question (Whisper keeps
 * refining the live tail), so the answer is generated once, not on every token.
 */
export function useLiveQuestion(text: string, stableMs = 1200): string | null {
  const [question, setQuestion] = useState<string | null>(null);

  useEffect(() => {
    const detected = extractLatestQuestion(text);
    const timer = setTimeout(() => {
      setQuestion((current) => {
        if (detected === null) {
          return current; // nothing to answer now — keep the previous answer on screen
        }
        if (current !== null && questionKey(current) === questionKey(detected)) {
          return current; // same question, just re-decoded — don't regenerate
        }
        return detected;
      });
    }, stableMs);
    return () => clearTimeout(timer);
  }, [text, stableMs]);

  return question;
}
