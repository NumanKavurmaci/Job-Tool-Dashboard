import type { Route } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui";

const links = [
  { href: "/" as Route, label: "Overview" },
  { href: "/reviews" as Route, label: "Review History" },
  { href: "/artifacts" as Route, label: "Artifacts" },
  { href: "/companies" as Route, label: "Companies" },
];

export function DashboardNav() {
  return (
    <nav className="sticky top-0 z-20 border-b border-line bg-ink/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-10">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-info">
            Job Tool Dashboard
          </p>
          <p className="text-sm text-muted">Read-only visibility over the engine workspace.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {links.map((link) => (
            <Link key={link.href} href={link.href}>
              <Badge tone="neutral">{link.label}</Badge>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
