import clsx from "clsx";
import type { ReactNode } from "react";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={clsx("rounded-3xl border border-line bg-panel/90 p-5 shadow-panel", className)}>
      {children}
    </section>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-info">{eyebrow}</p>
      <h2 className="text-xl font-semibold text-text">{title}</h2>
      {subtitle ? <p className="max-w-2xl text-sm text-muted">{subtitle}</p> : null}
    </div>
  );
}

export function Badge({
  tone,
  children,
}: {
  tone: "apply" | "skip" | "warn" | "info" | "neutral";
  children: ReactNode;
}) {
  const tones = {
    apply: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    skip: "border-rose-400/30 bg-rose-400/10 text-rose-300",
    warn: "border-amber-400/30 bg-amber-400/10 text-amber-300",
    info: "border-blue-400/30 bg-blue-400/10 text-blue-300",
    neutral: "border-slate-400/20 bg-slate-400/10 text-slate-200",
  } as const;

  return (
    <span className={clsx("inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", tones[tone])}>
      {children}
    </span>
  );
}
