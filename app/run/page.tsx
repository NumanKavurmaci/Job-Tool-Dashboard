import { PageIntro } from "@/components/dashboard/page-intro";
import { PageShell } from "@/components/dashboard/page-shell";
import { RunScriptBuilder } from "@/components/dashboard/run-script-builder";

export const dynamic = "force-dynamic";

export default function RunPage() {
  return (
    <PageShell>
      <PageIntro
        eyebrow="Run"
        title="Generate engine scripts without rebuilding them by hand."
        subtitle="Use the left panel to configure script options. The right panel turns them into the exact PowerShell `tsx` wrapper you can paste into terminal when you are ready, including the new `apply` and `apply-batch` commands."
      />
      <RunScriptBuilder />
    </PageShell>
  );
}
