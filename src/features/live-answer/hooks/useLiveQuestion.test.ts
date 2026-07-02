import { describe, expect, it } from "vitest";
import { extractLatestQuestion } from "./useLiveQuestion";

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
