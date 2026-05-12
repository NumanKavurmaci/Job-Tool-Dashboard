import { AnswersSection } from "@/components/dashboard/answers-section";
import { PageIntro } from "@/components/dashboard/page-intro";
import { PageShell } from "@/components/dashboard/page-shell";
import { readAnswerCache, readPreparedAnswerSets } from "@/lib/engine-db";

export const dynamic = "force-dynamic";

export default function AnswersPage() {
  const preparedAnswerSets = readPreparedAnswerSets();
  const answerCache = readAnswerCache();

  return (
    <PageShell>
      <PageIntro
        eyebrow="Answers"
        title="Generated survey answers and reusable answer memory."
        subtitle="Track what the engine produced for Easy Apply surveys, and inspect the cached answers it can reuse for repeated questions."
      />
      <AnswersSection
        preparedAnswerSets={preparedAnswerSets}
        answerCache={answerCache}
      />
    </PageShell>
  );
}
