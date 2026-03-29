import type { DashboardData } from "@/lib/dashboard-data";
import { Badge, Card, SectionTitle } from "@/components/ui";

export function ArtifactsSection({ artifacts }: Pick<DashboardData, "artifacts">) {
  return (
    <Card>
      <SectionTitle
        eyebrow="Artifacts"
        title="Recent generated files"
        subtitle="Batch reports and screenshots emitted by the engine."
      />
      <div className="mt-5 space-y-3">
        {artifacts.map((artifact) => (
          <div
            key={artifact.fullPath}
            className="rounded-2xl border border-line bg-panelSoft/80 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-sm font-medium text-text">{artifact.name}</p>
              <Badge tone="info">{artifact.category}</Badge>
            </div>
            <p className="mt-2 text-xs text-muted">{artifact.fullPath}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
