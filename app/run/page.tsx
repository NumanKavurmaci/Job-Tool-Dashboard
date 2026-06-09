import { PageIntro } from "@/components/dashboard/page-intro";
import { PageShell } from "@/components/dashboard/page-shell";
import { RunScriptBuilder } from "@/components/dashboard/run-script-builder";

export const dynamic = "force-dynamic";

export default function RunPage() {
  return (
    <PageShell>
      <PageIntro
        eyebrow="Run"
        title="Start and monitor engine workflows from the dashboard."
        subtitle="Configure a run, check local readiness, then watch the engine write decisions, reviews, and artifacts in real time. The CLI wrapper stays available as a fallback."
      />
      <RunScriptBuilder />
    </PageShell>
  );
}
