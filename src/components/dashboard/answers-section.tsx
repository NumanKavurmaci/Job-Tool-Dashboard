import type { DashboardData } from "@/lib/dashboard-data";
import { Badge, Card, SectionTitle } from "@/components/ui";

function safeParseArray(value: string): unknown[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function summarizeAnswerPayload(value: string): string {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (typeof parsed === "string") {
      return parsed;
    }
    if (parsed && typeof parsed === "object") {
      const stringValue =
        "value" in parsed && typeof (parsed as { value?: unknown }).value === "string"
          ? ((parsed as { value: string }).value)
          : null;
      if (stringValue) {
        return stringValue;
      }
      return JSON.stringify(parsed);
    }
    return String(parsed);
  } catch {
    return value;
  }
}

export function AnswersSection({
  preparedAnswerSets,
  answerCache,
}: Pick<DashboardData, "preparedAnswerSets" | "answerCache">) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <Card className="overflow-hidden">
        <SectionTitle
          eyebrow="Prepared Sets"
          title="Easy Apply survey answer sets"
          subtitle="Answer bundles generated for specific jobs, including the captured question count and the resolved answer payloads."
        />
        <div className="mt-5 space-y-4">
          {preparedAnswerSets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-panelSoft/40 p-6 text-sm text-muted">
              No prepared answer sets have been saved yet.
            </div>
          ) : (
            preparedAnswerSets.map((entry) => {
              const questions = safeParseArray(entry.questionsJson);
              const answers = safeParseArray(entry.answersJson);

              return (
                <article
                  key={entry.id}
                  className="rounded-2xl border border-line bg-panelSoft/80 p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <p className="text-base font-semibold text-text">
                        {entry.title ?? "Unknown title"}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
                        <span>{entry.company ?? "Unknown company"}</span>
                        <span>• {new Date(entry.createdAt).toLocaleString()}</span>
                      </div>
                      {entry.jobUrl ? (
                        <a
                          href={entry.jobUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex text-xs text-info hover:text-blue-300"
                        >
                          Open job posting
                        </a>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone="info">{questions.length} questions</Badge>
                      <Badge tone="neutral">{answers.length} answers</Badge>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted">Question labels</p>
                      <div className="flex flex-wrap gap-2">
                        {questions.length > 0 ? (
                          questions.slice(0, 8).map((question, index) => {
                            const label =
                              question && typeof question === "object" && "label" in question
                                ? String((question as { label?: unknown }).label ?? `Question ${index + 1}`)
                                : `Question ${index + 1}`;

                            return (
                              <Badge key={`${entry.id}-q-${index}`} tone="neutral">
                                {label}
                              </Badge>
                            );
                          })
                        ) : (
                          <p className="text-sm text-muted">No question payload captured.</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted">Answer preview</p>
                      <div className="space-y-2">
                        {answers.length > 0 ? (
                          answers.slice(0, 3).map((answer, index) => (
                            <div
                              key={`${entry.id}-a-${index}`}
                              className="rounded-xl border border-line bg-slate-950/30 p-3 text-sm text-slate-200"
                            >
                              {summarizeAnswerPayload(JSON.stringify(answer))}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted">No answer payload captured.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <SectionTitle
          eyebrow="Answer Memory"
          title="Cached survey answers"
          subtitle="Previously resolved answers the engine can reuse when the same normalized question appears again."
        />
        <div className="mt-5 space-y-3">
          {answerCache.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-panelSoft/40 p-6 text-sm text-muted">
              No cached answers have been saved yet.
            </div>
          ) : (
            answerCache.map((entry) => (
              <article
                key={entry.id}
                className="rounded-2xl border border-line bg-panelSoft/80 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-text">{entry.label}</p>
                    <p className="text-xs text-muted">{entry.normalizedQuestion}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="info">{entry.strategy}</Badge>
                    <Badge tone="neutral">{entry.questionType}</Badge>
                    <Badge tone="warn">{entry.confidenceLabel}</Badge>
                  </div>
                </div>
                <div className="mt-3 rounded-xl border border-line bg-slate-950/30 p-3 text-sm text-slate-200">
                  {summarizeAnswerPayload(entry.answerJson)}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                  <span>Source: {entry.source}</span>
                  <span>Updated: {new Date(entry.updatedAt).toLocaleString()}</span>
                </div>
              </article>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
