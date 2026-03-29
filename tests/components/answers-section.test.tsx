import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AnswersSection } from "@/src/components/dashboard/answers-section";

describe("AnswersSection", () => {
  it("renders empty states when no answer data exists", () => {
    const html = renderToStaticMarkup(
      <AnswersSection preparedAnswerSets={[]} answerCache={[]} />,
    );

    expect(html).toContain("No prepared answer sets have been saved yet.");
    expect(html).toContain("No cached answers have been saved yet.");
  });

  it("renders prepared sets and cached answers with human-readable previews", () => {
    const html = renderToStaticMarkup(
      <AnswersSection
        preparedAnswerSets={[
          {
            id: "prepared-1",
            jobPostingId: "job-1",
            createdAt: "2026-03-29T10:00:00.000Z",
            questionsJson: JSON.stringify([{ label: "Work authorization" }]),
            answersJson: JSON.stringify([{ value: "Yes, no sponsorship needed." }]),
            jobUrl: "https://www.linkedin.com/jobs/view/1",
            title: "Backend Engineer",
            company: "Acme",
          },
        ]}
        answerCache={[
          {
            id: "cache-1",
            normalizedQuestion: "do you need sponsorship",
            label: "Work authorization",
            questionType: "yes_no",
            strategy: "deterministic",
            answerJson: JSON.stringify({ value: "No" }),
            confidenceLabel: "high",
            source: "answer-cache",
            notesJson: null,
            createdAt: "2026-03-29T10:00:00.000Z",
            updatedAt: "2026-03-29T10:30:00.000Z",
          },
        ]}
      />,
    );

    expect(html).toContain("Backend Engineer");
    expect(html).toContain("Acme");
    expect(html).toContain("1 questions");
    expect(html).toContain("Yes, no sponsorship needed.");
    expect(html).toContain("Work authorization");
    expect(html).toContain("do you need sponsorship");
    expect(html).toContain("deterministic");
    expect(html).toContain("No");
  });

  it("handles invalid payload JSON and falls back to safe empty states", () => {
    const html = renderToStaticMarkup(
      <AnswersSection
        preparedAnswerSets={[
          {
            id: "prepared-2",
            jobPostingId: null,
            createdAt: "2026-03-29T10:00:00.000Z",
            questionsJson: "not-json",
            answersJson: "not-json",
            jobUrl: null,
            title: null,
            company: null,
          },
        ]}
        answerCache={[
          {
            id: "cache-2",
            normalizedQuestion: "custom payload",
            label: "Custom payload",
            questionType: "unknown",
            strategy: "generated",
            answerJson: "\"raw-string-answer\"",
            confidenceLabel: "medium",
            source: "llm",
            notesJson: null,
            createdAt: "2026-03-29T10:00:00.000Z",
            updatedAt: "2026-03-29T10:00:00.000Z",
          },
        ]}
      />,
    );

    expect(html).toContain("Unknown title");
    expect(html).toContain("Unknown company");
    expect(html).toContain("No question payload captured.");
    expect(html).toContain("No answer payload captured.");
    expect(html).toContain("raw-string-answer");
  });
});
