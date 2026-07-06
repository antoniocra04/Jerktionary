import { describe, expect, it } from "vitest";
import { extractForcedQuestion, extractLatestQuestion } from "./useLiveQuestion";

describe("extractLatestQuestion", () => {
  it("returns a question-marked sentence", () => {
    expect(extractLatestQuestion("Что такое инкапсуляция?")).toBe("Что такое инкапсуляция?");
  });

  it("picks the most recent question in a longer transcript", () => {
    const text = "Что такое ООП? Понятно. А что такое полиморфизм?";
    expect(extractLatestQuestion(text)).toBe("А что такое полиморфизм?");
  });

  it("accepts an imperative ask without a question mark", () => {
    expect(extractLatestQuestion("Расскажи про алгоритм Дейкстры")).toBe(
      "Расскажи про алгоритм Дейкстры"
    );
  });

  it("returns null for a plain statement", () => {
    expect(extractLatestQuestion("Сегодня хорошая погода.")).toBeNull();
  });

  it("returns null for empty text", () => {
    expect(extractLatestQuestion("")).toBeNull();
  });
});

describe("extractForcedQuestion", () => {
  it("takes the trailing sentences even without a question mark", () => {
    const text = "Что такое ООП? Понятно. Теперь про архитектуру. Опиши свой последний проект.";
    expect(extractForcedQuestion(text)).toBe(
      "Теперь про архитектуру. Опиши свой последний проект"
    );
  });

  it("works for a single sentence", () => {
    expect(extractForcedQuestion("Расскажи про индексы")).toBe("Расскажи про индексы");
  });

  it("returns null for empty text", () => {
    expect(extractForcedQuestion("  ")).toBeNull();
  });
});
