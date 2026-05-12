import type { Route } from "next";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui";

const primaryLinks = [
  { href: "/" as Route, label: "Overview" },
  { href: "/run" as Route, label: "Run" },
  { href: "/search" as Route, label: "Search" },
  { href: "/recommendations" as Route, label: "Recommendations" },
  { href: "/artifacts" as Route, label: "Artifacts" },
];

const secondaryLinks = [
  { href: "/reviews" as Route, label: "Review History" },
  { href: "/decisions" as Route, label: "Decisions" },
  { href: "/answers" as Route, label: "Answers" },
  { href: "/companies" as Route, label: "Companies" },
];

export function DashboardNav() {
  return (
    <nav className="sticky top-0 z-20 border-b border-line bg-ink/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-10">
        <div className="min-w-0 space-y-1">
          <Link href="/" className="inline-block">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-info transition hover:text-blue-300">
              Job Tool Dashboard
            </p>
          </Link>
          <p className="text-sm text-muted">Read-only visibility over the engine workspace.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {primaryLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Badge tone="neutral">{link.label}</Badge>
            </Link>
          ))}
          <details className="group relative shrink-0">
            <summary className="flex cursor-pointer list-none items-center gap-1 rounded-full border border-slate-400/20 bg-slate-400/10 px-2.5 py-1 text-xs font-medium text-slate-200 transition hover:border-slate-300/30 hover:bg-slate-300/10 [&::-webkit-details-marker]:hidden">
              More
              <ChevronDown className="size-3 transition group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="absolute right-0 z-30 mt-2 w-48 rounded-2xl border border-line bg-panel p-2 shadow-panel">
              {secondaryLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block rounded-xl px-3 py-2 text-sm text-slate-200 transition hover:bg-panelSoft hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </details>
        </div>
      </div>
    </nav>
  );
}
