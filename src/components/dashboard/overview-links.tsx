import type { Route } from "next";
import Link from "next/link";
import { ArrowRight, Archive, Building2, ClipboardList, History, MessagesSquare, PlaySquare, Search, Sparkles } from "lucide-react";
import { Card } from "@/components/ui";

const sections = [
  {
    href: "/run" as Route,
    title: "Run",
    description: "Generate ready-to-paste PowerShell `tsx` scripts from structured dashboard options.",
    icon: PlaySquare,
  },
  {
    href: "/search" as Route,
    title: "Search",
    description: "Search every collection separately and inspect grouped results under dedicated sub-headings.",
    icon: Search,
  },
  {
    href: "/recommendations" as Route,
    title: "Recommendations",
    description: "Review the jobs explore mode marked as worth pursuing, without any apply flow execution.",
    icon: Sparkles,
  },
  {
    href: "/search?filter=incomplete&collection=reviews" as Route,
    title: "Incomplete Applications",
    description: "Jump straight to approved jobs that still have not reached a submitted state.",
    icon: ClipboardList,
  },
  {
    href: "/reviews" as Route,
    title: "Review History",
    description: "Inspect recent decisions, scores, thresholds, and apply, skip, or incomplete outcomes.",
    icon: History,
  },
  {
    href: "/decisions" as Route,
    title: "Decisions",
    description: "Inspect detailed decision records, score snapshots, policy results, and linked company/job context.",
    icon: ClipboardList,
  },
  {
    href: "/answers" as Route,
    title: "Answers",
    description: "Inspect generated Easy Apply survey answers and reusable cached answer memory.",
    icon: MessagesSquare,
  },
  {
    href: "/artifacts" as Route,
    title: "Artifacts",
    description: "Browse generated JSON reports, screenshots, and other engine outputs.",
    icon: Archive,
  },
  {
    href: "/companies" as Route,
    title: "Companies",
    description: "See firm-level totals, logos, and decision ids aggregated by company.",
    icon: Building2,
  },
];

export function OverviewLinks() {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-200/75">
            Show More
          </p>
          <h2 className="text-2xl font-semibold text-text">Open the pages built for deeper review</h2>
          <p className="max-w-3xl text-sm leading-6 text-muted">
            The homepage is only the quick summary. Each destination below takes you straight into the full dataset for that area.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
        {sections.map((section) => {
          const Icon = section.icon;

          return (
            <Link key={section.href} href={section.href}>
              <Card className="h-full transition-transform duration-150 hover:-translate-y-0.5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="inline-flex rounded-2xl border border-line bg-panelSoft/80 p-3 text-info">
                      <Icon size={18} />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-lg font-semibold text-text">{section.title}</h2>
                      <p className="text-sm leading-6 text-muted">{section.description}</p>
                    </div>
                  </div>
                  <ArrowRight className="mt-1 text-slate-500" size={18} />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
