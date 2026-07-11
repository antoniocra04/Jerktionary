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

  it("does nothing when currentText is empty", async () => {
    await handleFullContextAnswer();

    expect(mockBeginAnswerStreaming).not.toHaveBeenCalled();
    expect(mockAnswerQuestionStream).not.toHaveBeenCalled();
  });

  it("calls answerQuestionStream with full context using last sentence", async () => {
    const longText = ("A. ".repeat(500)) + "что-то про технологии.";
    const lastSentence = "расскажи про микросервисы.";
    mockStore.currentText = longText + " " + lastSentence;
    const mockAnswer = { answer: "Это подход...", points: [], example: "" };
    mockAnswerQuestionStream.mockResolvedValue(mockAnswer);

    await handleFullContextAnswer();

    expect(mockBeginAnswerStreaming).toHaveBeenCalledTimes(1);

    // verify full context was sent, untruncated
    expect(mockAnswerQuestionStream).toHaveBeenCalledTimes(1);
    const callArgs = mockAnswerQuestionStream.mock.calls[0];
    // lastSentence() returns only the last sentence, stripped of trailing punctuation
    expect(callArgs[0]).toBe("расскажи про микросервисы");
    expect(callArgs[1]).toBe(mockStore.currentText); // full context
    expect(callArgs[5]).toBe(false); // truncateContext = false

    expect(mockRecordAnswer).toHaveBeenCalledWith("расскажи про микросервисы", mockAnswer);
    expect(mockEndAnswerStreaming).toHaveBeenCalledTimes(1);
  });

  it("calls endAnswerStreaming even if the API call fails", async () => {
    mockStore.currentText = "Как работает Docker?";
    mockAnswerQuestionStream.mockRejectedValue(new Error("API error"));

    await handleFullContextAnswer();

    expect(mockEndAnswerStreaming).toHaveBeenCalledTimes(1);
    expect(mockRecordAnswer).not.toHaveBeenCalled();
  });
});
