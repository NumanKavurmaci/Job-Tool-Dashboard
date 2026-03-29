import type { Route } from "next";
import Link from "next/link";
import { ArrowRight, Archive, Building2, History } from "lucide-react";
import { Card } from "@/components/ui";

const sections = [
  {
    href: "/reviews" as Route,
    title: "Review History",
    description: "Inspect recent decisions, scores, thresholds, and skip/apply reasons.",
    icon: History,
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
    <section className="grid gap-4 lg:grid-cols-3">
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
    </section>
  );
}
