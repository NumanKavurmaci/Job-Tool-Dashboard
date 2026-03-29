import type { DashboardData } from "@/lib/dashboard-data";
import { ArtifactsSection } from "@/components/dashboard/artifacts-section";
import { LogsSection } from "@/components/dashboard/logs-section";

export function SidebarSections({
  artifacts,
  logs,
}: Pick<DashboardData, "artifacts" | "logs">) {
  return (
    <div className="grid gap-6">
      <ArtifactsSection artifacts={artifacts} />
      <LogsSection logs={logs} />
    </div>
  );
}
