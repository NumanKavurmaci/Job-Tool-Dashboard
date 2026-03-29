import type { DashboardData } from "@/lib/dashboard-data";
import { Badge, Card, SectionTitle } from "@/components/ui";

function getLogTone(level: DashboardData["logs"][number]["level"]) {
  if (level === "ERROR") {
    return "skip" as const;
  }

  if (level === "WARN") {
    return "warn" as const;
  }

  return "info" as const;
}

export function LogsSection({ logs }: Pick<DashboardData, "logs">) {
  return (
    <Card>
      <SectionTitle
        eyebrow="Observability"
        title="Recent system logs"
        subtitle="Structured events already stored by the engine."
      />
      <div className="mt-5 space-y-3">
        {logs.map((log) => (
          <div key={log.id} className="rounded-2xl border border-line bg-panelSoft/80 p-4">
            <div className="flex items-center justify-between gap-3">
              <Badge tone={getLogTone(log.level)}>{log.level}</Badge>
              <p className="text-xs text-muted">{new Date(log.createdAt).toLocaleString()}</p>
            </div>
            <p className="mt-3 text-sm font-medium text-text">{log.message}</p>
            <p className="mt-1 text-xs text-muted">
              {log.scope}
              {log.jobUrl ? ` / ${log.jobUrl}` : ""}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
