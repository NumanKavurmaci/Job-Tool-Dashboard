"use client";

import { useState } from "react";

export function CompanyLogo({
  company,
  logoUrl,
  linkedinUrl,
}: {
  company: string | null;
  logoUrl: string | null;
  linkedinUrl: string | null;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const companyName = company ?? "Unknown company";
  const hasRenderableLogo = Boolean(logoUrl) && !imageFailed;
  const logo = hasRenderableLogo ? (
    <img
      src={logoUrl ?? undefined}
      alt={`${companyName} logo`}
      className="h-full w-full object-contain"
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setImageFailed(true)}
    />
  ) : (
    <span className="text-lg font-bold text-sky-100" aria-hidden="true">
      {companyName.slice(0, 1).toUpperCase()}
    </span>
  );
  const className = `flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 p-2 shadow-[0_12px_28px_rgba(2,6,23,0.28)] ${
    hasRenderableLogo ? "bg-white" : "bg-sky-300/10"
  }`;

  return linkedinUrl ? (
    <a
      href={linkedinUrl}
      target="_blank"
      rel="noreferrer"
      className={`${className} transition hover:-translate-y-0.5 hover:border-sky-300/40`}
      aria-label={`${companyName} LinkedIn company page`}
    >
      {logo}
    </a>
  ) : (
    <div className={className}>{logo}</div>
  );
}
