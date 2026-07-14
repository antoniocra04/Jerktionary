import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockPushQuestion, mockSetFullContext } = vi.hoisted(() => ({
  mockPushQuestion: vi.fn(),
  mockSetFullContext: vi.fn()
}));

const mockStore = {
  answeredQuestions: [] as string[],
  currentText: "",
  pushQuestion: mockPushQuestion,
  setFullContext: mockSetFullContext
};

vi.mock("@/features/transcript/store/transcript-store", () => ({
  useTranscriptStore: {
    getState: () => mockStore
  }
}));

import { handleFullContextAnswer } from "./full-context-answer";

describe("handleFullContextAnswer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.answeredQuestions = [];
    mockStore.currentText = "";
  });

  it("does nothing when currentText is empty", async () => {
    await handleFullContextAnswer();

    expect(mockPushQuestion).not.toHaveBeenCalled();
    expect(mockSetFullContext).not.toHaveBeenCalled();
  });

  it("sets full-context flag and pushes last sentence as question", async () => {
    const context = "длинный текст про архитектуру.";
    const lastSentence = "расскажи про микросервисы.";
    mockStore.currentText = context + " " + lastSentence;

    await handleFullContextAnswer();

    expect(mockSetFullContext).toHaveBeenCalledTimes(1);
    expect(mockPushQuestion).toHaveBeenCalledWith("расскажи про микросервисы");
  });

  it("strips trailing punctuation from last sentence", async () => {
    mockStore.currentText = "Что такое ООП?!";

    await handleFullContextAnswer();

    expect(mockSetFullContext).toHaveBeenCalledTimes(1);
    expect(mockPushQuestion).toHaveBeenCalledWith("Что такое ООП");
  });
});
