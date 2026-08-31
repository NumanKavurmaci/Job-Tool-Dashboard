import { ExternalLink, Linkedin } from "lucide-react";

export type ApplicationType = "easy_apply" | "external";

export function normalizeApplicationType(value: string | null | undefined): ApplicationType | null {
  const normalized = value?.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized === "easy_apply") {
    return "easy_apply";
  }
  if (normalized === "external" || normalized === "external_apply") {
    return "external";
  }
  return null;
}

export function ApplicationTypeBadge({ value }: { value: string | null | undefined }) {
  const applicationType = normalizeApplicationType(value);
  if (!applicationType) {
    return null;
  }

  return applicationType === "easy_apply" ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/35 bg-blue-400/10 px-2.5 py-1 text-xs font-semibold text-blue-200">
      <Linkedin className="size-3.5" aria-hidden="true" />
      Easy Apply
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/35 bg-violet-400/10 px-2.5 py-1 text-xs font-semibold text-violet-200">
      <ExternalLink className="size-3.5" aria-hidden="true" />
      External Apply
    </span>
  );
}
