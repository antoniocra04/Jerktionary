import { describe, expect, it, vi, beforeEach } from "vitest";

const {
  mockBeginAnswerStreaming,
  mockEndAnswerStreaming,
  mockRecordAnswer,
  mockAnswerQuestionStream
} = vi.hoisted(() => ({
  mockBeginAnswerStreaming: vi.fn(),
  mockEndAnswerStreaming: vi.fn(),
  mockRecordAnswer: vi.fn(),
  mockAnswerQuestionStream: vi.fn()
}));

const mockStore = {
  answeredQuestions: [] as string[],
  currentText: "",
  beginAnswerStreaming: mockBeginAnswerStreaming,
  endAnswerStreaming: mockEndAnswerStreaming,
  recordAnswer: mockRecordAnswer
};

vi.mock("@/features/transcript/store/transcript-store", () => ({
  useTranscriptStore: {
    getState: () => mockStore
  }
}));

vi.mock("./answer-question-stream", () => ({
  answerQuestionStream: mockAnswerQuestionStream
}));

import { handleFullContextAnswer } from "./full-context-answer";

describe("handleFullContextAnswer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.answeredQuestions = [];
    mockStore.currentText = "";
  });

  it("calls onNoQuestion when answeredQuestions is empty", async () => {
    const onNoQuestion = vi.fn();

    await handleFullContextAnswer(onNoQuestion);

    expect(onNoQuestion).toHaveBeenCalledTimes(1);
    expect(mockAnswerQuestionStream).not.toHaveBeenCalled();
    expect(mockBeginAnswerStreaming).not.toHaveBeenCalled();
  });

  it("calls answerQuestionStream with full context when a question exists", async () => {
    const question = "Что такое микросервис?";
    const longText = "A".repeat(5000); // 5000 chars — well beyond 2000
    const mockAnswer = { answer: "Это подход...", points: [], example: "" };

    mockStore.answeredQuestions = [question];
    mockStore.currentText = longText;
    mockAnswerQuestionStream.mockResolvedValue(mockAnswer);

    const onNoQuestion = vi.fn();

    await handleFullContextAnswer(onNoQuestion);

    expect(onNoQuestion).not.toHaveBeenCalled();
    expect(mockBeginAnswerStreaming).toHaveBeenCalledTimes(1);

    // Verify answerQuestionStream was called with the FULL context, not truncated
    expect(mockAnswerQuestionStream).toHaveBeenCalledTimes(1);
    const callArgs = mockAnswerQuestionStream.mock.calls[0];
    expect(callArgs[0]).toBe(question); // question
    expect(callArgs[1]).toBe(longText); // context — full, NOT sliced
    expect(callArgs[2]).toBe(false); // deep
    expect(callArgs[5]).toBe(false); // truncateContext = false

    expect(mockRecordAnswer).toHaveBeenCalledWith(question, mockAnswer);
    expect(mockEndAnswerStreaming).toHaveBeenCalledTimes(1);
  });

  it("uses the most recent question (answeredQuestions[0])", async () => {
    const latestQuestion = "Как работает Docker?";
    const olderQuestion = "Что такое ООП?";
    const mockAnswer = { answer: "Docker это...", points: [], example: "" };

    mockStore.answeredQuestions = [latestQuestion, olderQuestion];
    mockStore.currentText = "some context";
    mockAnswerQuestionStream.mockResolvedValue(mockAnswer);

    await handleFullContextAnswer(vi.fn());

    expect(mockAnswerQuestionStream).toHaveBeenCalledTimes(1);
    expect(mockAnswerQuestionStream.mock.calls[0][0]).toBe(latestQuestion);
  });

  it("calls endAnswerStreaming even if the API call fails", async () => {
    mockStore.answeredQuestions = ["Вопрос?"];
    mockStore.currentText = "something";
    mockAnswerQuestionStream.mockRejectedValue(new Error("API error"));

    // Should resolve (error is caught internally)
    await handleFullContextAnswer(vi.fn());

    expect(mockEndAnswerStreaming).toHaveBeenCalledTimes(1);
    expect(mockRecordAnswer).not.toHaveBeenCalled();
  });
});
