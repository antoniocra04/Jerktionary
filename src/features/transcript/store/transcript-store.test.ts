import { beforeEach, describe, expect, it } from "vitest";
import { useTranscriptStore } from "./transcript-store";

describe("pushQuestion deduplication", () => {
  beforeEach(() => {
    useTranscriptStore.setState({ answeredQuestions: [] });
  });

  it("adds a new question", () => {
    useTranscriptStore.getState().pushQuestion("Что такое инкапсуляция?");
    expect(useTranscriptStore.getState().answeredQuestions).toEqual([
      "Что такое инкапсуляция?"
    ]);
  });

  it("ignores an exact repeat", () => {
    useTranscriptStore.getState().pushQuestion("Что такое инкапсуляция?");
    useTranscriptStore.getState().pushQuestion("Что такое инкапсуляция?");
    expect(useTranscriptStore.getState().answeredQuestions).toEqual([
      "Что такое инкапсуляция?"
    ]);
  });

  it("ignores a Whisper paraphrase that prepends a filler word", () => {
    // The bug: Whisper re-decodes "Что такое инкапсуляция?" as "А что такое
    // инкапсуляция?" and the old exact comparison added it as a duplicate.
    useTranscriptStore.getState().pushQuestion("Что такое инкапсуляция?");
    useTranscriptStore.getState().pushQuestion("А что такое инкапсуляция?");
    expect(useTranscriptStore.getState().answeredQuestions).toEqual([
      "Что такое инкапсуляция?"
    ]);
  });

  it("ignores punctuation/casing-only differences", () => {
    useTranscriptStore.getState().pushQuestion("Что такое ООП?");
    useTranscriptStore.getState().pushQuestion("что такое ооп");
    expect(useTranscriptStore.getState().answeredQuestions).toEqual([
      "Что такое ООП?"
    ]);
  });

  it("ignores stacked leading fillers", () => {
    useTranscriptStore.getState().pushQuestion("Как работает event loop?");
    useTranscriptStore.getState().pushQuestion("ну а как работает event loop?");
    expect(useTranscriptStore.getState().answeredQuestions).toEqual([
      "Как работает event loop?"
    ]);
  });

  it("keeps genuinely different questions", () => {
    useTranscriptStore.getState().pushQuestion("Что такое ООП?");
    useTranscriptStore.getState().pushQuestion("Что такое полиморфизм?");
    expect(useTranscriptStore.getState().answeredQuestions).toEqual([
      "Что такое полиморфизм?",
      "Что такое ООП?"
    ]);
  });

  it("preserves the newest-first order and the 8-entry cap", () => {
    for (let i = 0; i < 10; i += 1) {
      useTranscriptStore.getState().pushQuestion(`вопрос номер ${i}?`);
    }
    const result = useTranscriptStore.getState().answeredQuestions;
    expect(result).toHaveLength(8);
    expect(result[0]).toBe("вопрос номер 9?");
  });
});
