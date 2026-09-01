"use client";

import {
  AlertTriangle,
  Braces,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  ExternalLink,
  FileJson,
  Link2,
  LoaderCircle,
  MapPin,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Sprout,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Card, SectionTitle } from "@/components/ui";
import {
  CandidateProfileValidationError,
  normalizeCandidateProfile,
  normalizeProfileComparisonKey,
  type CandidateProfileDocument,
  type DisclosurePreference,
  type RemotePreference,
  type StringNumberOrNull,
  type VisaRequirement,
  type WorkAuthorizationStatus,
} from "@/lib/candidate-profile-schema";

export type ProfileSnapshot = {
  profile: CandidateProfileDocument;
  revision: string;
  source: "profile" | "example" | "default";
  profilePath: string;
  sourcePath: string | null;
  updatedAt: string | null;
};

type SectionId = "targets" | "locations" | "authorization" | "personal" | "work" | "links" | "advanced";

const SECTION_OPTIONS: Array<{
  id: SectionId;
  label: string;
  detail: string;
  icon: LucideIcon;
  tone: string;
}> = [
  { id: "targets", label: "Targets & skills", detail: "Experience, roles, technologies", icon: Sprout, tone: "violet" },
  { id: "locations", label: "Location preferences", detail: "Remote, hybrid, and regions", icon: MapPin, tone: "emerald" },
  { id: "authorization", label: "Work authorization", detail: "Visa and sponsorship", icon: ShieldCheck, tone: "blue" },
  { id: "personal", label: "Personal details", detail: "Languages and application answers", icon: UserRound, tone: "amber" },
  { id: "work", label: "Compensation & availability", detail: "Expectations and start date", icon: CircleDollarSign, tone: "cyan" },
  { id: "links", label: "Links", detail: "Profiles and references", icon: Link2, tone: "rose" },
  { id: "advanced", label: "Advanced JSON", detail: "Complete file", icon: FileJson, tone: "slate" },
];

const SECTION_LABELS: Record<string, string> = {
  experience: "Experience",
  targeting: "Targets",
  locations: "Locations",
  authorization: "Work authorization",
  personal: "Personal details",
  identity: "Links",
  compensation: "Compensation",
  availability: "Availability",
  references: "References",
};

const INPUT_CLASS = "w-full rounded-2xl border border-line bg-slate-950/75 px-4 py-3 text-sm text-text outline-none transition placeholder:text-slate-600 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20";
const SELECT_CLASS = `${INPUT_CLASS} min-h-12`;
const ValidationIssuesContext = createContext<string[]>([]);
const TECH_SUGGESTIONS = ["TypeScript", "Node.js", "React", "Next.js", "PostgreSQL", "Docker", "Kubernetes", "Python", "AWS", "Azure", "Redis", "Prisma"];
const BROAD_EXCLUSION_KEYS = new Set(["test", "java", "qa", "web", "software", "developer", "engineer", "data"]);

function ValidationBoundary({ issues, children }: { issues: string[]; children: React.ReactNode }) {
  if (issues.length === 0) return <>{children}</>;
  return <ValidationIssuesContext.Provider value={issues}>{children}</ValidationIssuesContext.Provider>;
}

function profileCopy(profile: CandidateProfileDocument): CandidateProfileDocument {
  return JSON.parse(JSON.stringify(profile)) as CandidateProfileDocument;
}

function textValue(value: StringNumberOrNull): string {
  return value == null ? "" : String(value);
}

function nullableText(value: string): string | null {
  return value.trim() ? value : null;
}

function nullableScalar(value: string): string | null {
  return value.trim() ? value : null;
}

function formatUpdatedAt(value: string | null): string {
  if (!value) return "No local profile has been created yet";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function issuesForPath(issues: string[], path?: string): string[] {
  if (!path) return [];
  return issues.filter((issue) => issue === path || issue.startsWith(`${path}.`) || issue.startsWith(`${path}[`) || issue.startsWith(`${path} `));
}

function profileIssueMessage(issue: string): string {
  if (issue.includes("must be a complete http(s) URL")) return "Enter a complete web address beginning with https://.";
  if (issue.includes("must not be negative")) return "Negative values are not allowed.";
  if (issue.includes("conflicts with locations")) return "A location cannot be both preferred and excluded.";
  if (issue.includes("duplicates another technology")) return "This technology already exists under another spelling.";
  if (issue.includes("empty technology name")) return "Technology name cannot be blank.";
  if (issue.includes("must be a non-negative number")) return "Enter zero or a greater value.";
  if (issue.includes("must be a number between")) return "Enter a value within the allowed range.";
  if (issue.includes("is required")) return "This field is required.";
  if (issue.includes("must not be empty")) return "Blank values cannot be added.";
  return issue;
}

function sectionForIssue(issue: string): SectionId {
  if (issue.startsWith("experience") || issue.startsWith("targeting")) return "targets";
  if (issue.startsWith("locations")) return "locations";
  if (issue.startsWith("authorization")) return "authorization";
  if (issue.startsWith("personal")) return "personal";
  if (issue.startsWith("compensation") || issue.startsWith("availability")) return "work";
  if (issue.startsWith("identity") || issue.startsWith("references")) return "links";
  return "advanced";
}

function isOpenableUrl(value: string | null): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && Boolean(url.hostname);
  } catch {
    return false;
  }
}

function nextOverrideName(overrides: Record<string, number>): string {
  let suffix = 1;
  let candidate = "New technology";
  const keys = new Set(Object.keys(overrides).map(normalizeProfileComparisonKey));
  while (keys.has(normalizeProfileComparisonKey(candidate))) {
    suffix += 1;
    candidate = `New technology ${suffix}`;
  }
  return candidate;
}

function Field({
  label,
  help,
  path,
  children,
}: {
  label: string;
  help?: string;
  path?: string;
  children: React.ReactNode;
}) {
  const issues = issuesForPath(useContext(ValidationIssuesContext), path);
  return (
    <label className="space-y-2" data-profile-path={path}>
      <span className="block text-sm font-medium text-text">{label}</span>
      {help ? <span className="block text-xs leading-5 text-muted">{help}</span> : null}
      {children}
      {issues.map((issue) => <span key={issue} className="block text-xs leading-5 text-rose-200" role="alert">{profileIssueMessage(issue)}</span>)}
    </label>
  );
}

function NullableBooleanSelect({
  value,
  onChange,
  ariaLabel,
}: {
  value: boolean | null;
  onChange: (value: boolean | null) => void;
  ariaLabel: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      className={SELECT_CLASS}
      value={value == null ? "unknown" : String(value)}
      onChange={(event) => onChange(event.target.value === "unknown" ? null : event.target.value === "true")}
    >
      <option value="unknown">Not specified</option>
      <option value="true">Yes</option>
      <option value="false">No</option>
    </select>
  );
}

function TagEditor({
  label,
  help,
  path,
  values,
  onChange,
  placeholder,
  ordered = false,
  suggestions = [],
  tone = "neutral",
}: {
  label: string;
  help?: string;
  path: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  ordered?: boolean;
  suggestions?: string[];
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);
  const issues = issuesForPath(useContext(ValidationIssuesContext), path);
  const toneClasses = {
    neutral: "border-slate-500/30 bg-slate-400/10 text-slate-100",
    success: "border-emerald-400/25 bg-emerald-400/10 text-emerald-100",
    warning: "border-amber-400/25 bg-amber-400/10 text-amber-100",
    danger: "border-rose-400/25 bg-rose-400/10 text-rose-100",
  };

  const visibleSuggestions = draft.trim()
    ? suggestions.filter((suggestion) => normalizeProfileComparisonKey(suggestion).includes(normalizeProfileComparisonKey(draft)) && !values.some((value) => normalizeProfileComparisonKey(value) === normalizeProfileComparisonKey(suggestion))).slice(0, 6)
    : [];

  function addValue() {
    const existingKeys = new Set(values.map(normalizeProfileComparisonKey));
    const nextValues: string[] = [];
    let duplicateFound = false;
    for (const value of draft.split(",").map((item) => item.trim()).filter(Boolean)) {
      const key = normalizeProfileComparisonKey(value);
      if (existingKeys.has(key)) {
        duplicateFound = true;
        continue;
      }
      existingKeys.add(key);
      nextValues.push(value);
    }
    if (nextValues.length === 0) {
      setDraftError(duplicateFound ? "This value or spelling variation is already in the list." : "Enter a value first.");
      return;
    }
    onChange([...values, ...nextValues]);
    setDraft("");
    setDraftError(duplicateFound ? "The duplicate value was not added." : null);
  }

  function addSuggestion(value: string) {
    onChange([...values, value]);
    setDraft("");
    setDraftError(null);
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= values.length) return;
    const next = [...values];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="space-y-3" data-profile-path={path}>
      <div>
        <p className="text-sm font-medium text-text">{label}</p>
        {help ? <p className="mt-1 text-xs leading-5 text-muted">{help}</p> : null}
      </div>

      {values.length > 0 ? (
        <div className={ordered ? "grid gap-2" : "flex flex-wrap gap-2"}>
          {values.map((value, index) => (
            ordered ? (
              <div key={`${value}-${index}`} className="flex min-h-12 items-center gap-3 rounded-2xl border border-line bg-black/20 px-3 py-2">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-violet-400/15 text-xs font-semibold text-violet-200">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-text">{value}</span>
                <div className="flex items-center gap-1">
                  <button aria-label={`Move ${value} up`} className="rounded-lg p-2 text-muted transition hover:bg-white/5 hover:text-text disabled:opacity-30" disabled={index === 0} type="button" onClick={() => move(index, -1)}><ChevronUp className="size-4" /></button>
                  <button aria-label={`Move ${value} down`} className="rounded-lg p-2 text-muted transition hover:bg-white/5 hover:text-text disabled:opacity-30" disabled={index === values.length - 1} type="button" onClick={() => move(index, 1)}><ChevronDown className="size-4" /></button>
                  <button aria-label={`Remove ${value}`} className="rounded-lg p-2 text-muted transition hover:bg-rose-400/10 hover:text-rose-200" type="button" onClick={() => onChange(values.filter((_, itemIndex) => itemIndex !== index))}><X className="size-4" /></button>
                </div>
              </div>
            ) : (
              <span key={`${value}-${index}`} className={`inline-flex min-h-10 items-center gap-1 rounded-full border pl-3 text-sm ${toneClasses[tone]}`}>
                {value}
                <button aria-label={`Remove ${value}`} className="flex size-10 items-center justify-center rounded-full text-muted transition hover:bg-rose-400/10 hover:text-rose-200" type="button" onClick={() => onChange(values.filter((_, itemIndex) => itemIndex !== index))}><X className="size-4" /></button>
              </span>
            )
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-line bg-black/10 px-4 py-5 text-sm text-muted">No values added yet.</div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          aria-label={`New value for ${label}`}
          className={INPUT_CLASS}
          placeholder={placeholder}
          value={draft}
          onChange={(event) => { setDraft(event.target.value); setDraftError(null); }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addValue();
            }
          }}
        />
        <button className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl border border-line bg-white/5 px-4 text-sm font-semibold text-text transition hover:border-slate-500 hover:bg-white/10" type="button" onClick={addValue}>
          <Plus className="size-4" aria-hidden="true" /> Add
        </button>
      </div>
      {visibleSuggestions.length > 0 ? <div className="flex flex-wrap gap-2" aria-label={`${label} suggestions`}>{visibleSuggestions.map((suggestion) => <button key={suggestion} className="min-h-10 rounded-full border border-blue-400/20 bg-blue-400/5 px-3 text-xs font-medium text-blue-100 transition hover:bg-blue-400/10" type="button" onClick={() => addSuggestion(suggestion)}>+ {suggestion}</button>)}</div> : null}
      {draftError ? <p className="text-xs leading-5 text-amber-200" role="status">{draftError}</p> : null}
      {issues.map((issue) => <p key={issue} className="text-xs leading-5 text-rose-200" role="alert">{profileIssueMessage(issue)}</p>)}
    </div>
  );
}

function SectionCard({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="space-y-5">
      <SectionTitle eyebrow={eyebrow} title={title} subtitle={subtitle} />
      {children}
    </Card>
  );
}

export function ProfileEditor({
  initialSnapshot = null,
  initialSection = "targets",
}: {
  initialSnapshot?: ProfileSnapshot | null;
  initialSection?: SectionId;
} = {}) {
  const [snapshot, setSnapshot] = useState<ProfileSnapshot | null>(initialSnapshot);
  const [profile, setProfile] = useState<CandidateProfileDocument | null>(() => initialSnapshot ? profileCopy(initialSnapshot.profile) : null);
  const [originalProfile, setOriginalProfile] = useState<CandidateProfileDocument | null>(() => initialSnapshot ? profileCopy(initialSnapshot.profile) : null);
  const [activeSection, setActiveSection] = useState<SectionId>(initialSection);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(!initialSnapshot);
  const [isSaving, setIsSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [rawJson, setRawJson] = useState(() => initialSnapshot ? JSON.stringify(initialSnapshot.profile, null, 2) : "");
  const [rawError, setRawError] = useState<string | null>(null);

  const isDirty = useMemo(
    () => Boolean(profile && originalProfile && JSON.stringify(profile) !== JSON.stringify(originalProfile)),
    [profile, originalProfile],
  );

  const changedSections = useMemo(() => {
    if (!profile || !originalProfile) return [];
    const keys = new Set([...Object.keys(profile), ...Object.keys(originalProfile)]);
    return [...keys]
      .filter((key) => JSON.stringify((profile as unknown as Record<string, unknown>)[key]) !== JSON.stringify((originalProfile as unknown as Record<string, unknown>)[key]))
      .map((key) => SECTION_LABELS[key] ?? key);
  }, [profile, originalProfile]);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    setSaveError(null);
    setIssues([]);
    try {
      const response = await fetch("/api/profile", { cache: "no-store" });
      const payload = await response.json() as Partial<ProfileSnapshot> & { error?: string; issues?: string[] };
      if (!response.ok || !payload.profile || !payload.revision) {
        throw new Error(payload.issues?.join(" ") || payload.error || "Profile could not be loaded.");
      }
      const nextSnapshot = payload as ProfileSnapshot;
      setSnapshot(nextSnapshot);
      setProfile(profileCopy(nextSnapshot.profile));
      setOriginalProfile(profileCopy(nextSnapshot.profile));
      setRawJson(JSON.stringify(nextSnapshot.profile, null, 2));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Profile could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialSnapshot) void loadProfile();
  }, [initialSnapshot, loadProfile]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    function warnBeforeLeave(event: BeforeUnloadEvent) {
      if (!isDirty) return;
      event.preventDefault();
    }
    window.addEventListener("beforeunload", warnBeforeLeave);
    return () => window.removeEventListener("beforeunload", warnBeforeLeave);
  }, [isDirty]);

  function updateProfile(updater: (current: CandidateProfileDocument) => CandidateProfileDocument) {
    setSavedFlash(false);
    setSaveError(null);
    setIssues([]);
    setProfile((current) => current ? updater(current) : current);
  }

  function openSection(sectionId: SectionId) {
    if (sectionId === "advanced" && profile) {
      setRawJson(JSON.stringify(profile, null, 2));
      setRawError(null);
    }
    setActiveSection(sectionId);
  }

  function resetChanges() {
    if (!originalProfile) return;
    const next = profileCopy(originalProfile);
    setProfile(next);
    setRawJson(JSON.stringify(next, null, 2));
    setSaveError(null);
    setIssues([]);
    setRawError(null);
  }

  function applyRawJson() {
    try {
      const nextProfile = normalizeCandidateProfile(JSON.parse(rawJson) as unknown);
      setProfile(nextProfile);
      setRawJson(JSON.stringify(nextProfile, null, 2));
      setRawError(null);
      setSaveError(null);
      setIssues([]);
    } catch (error) {
      if (error instanceof CandidateProfileValidationError) {
        setRawError(error.issues.join(" "));
      } else {
        setRawError(error instanceof Error ? error.message : "Invalid JSON.");
      }
    }
  }

  function focusFirstIssue(nextIssues: string[]) {
    const firstIssue = nextIssues[0];
    if (!firstIssue) return;
    setActiveSection(sectionForIssue(firstIssue));
    globalThis.setTimeout(() => {
      if (typeof document === "undefined") return;
      const container = [...document.querySelectorAll<HTMLElement>("[data-profile-path]")]
        .find((element) => issuesForPath([firstIssue], element.dataset.profilePath).length > 0);
      container?.querySelector<HTMLElement>("input, select, textarea, button")?.focus();
    }, 0);
  }

  function renameOverride(technology: string, nextTechnology: string, years: number) {
    if (!profile) return;
    const duplicate = Object.keys(profile.experience.overrides).some((key) => key !== technology && normalizeProfileComparisonKey(key) === normalizeProfileComparisonKey(nextTechnology));
    if (duplicate) {
      const nextIssues = [`experience.overrides.${nextTechnology} duplicates another technology.`];
      setIssues(nextIssues);
      setSaveError("The same technology cannot be added twice.");
      return;
    }
    updateProfile((current) => {
      const overrides = { ...current.experience.overrides };
      delete overrides[technology];
      overrides[nextTechnology] = years;
      return { ...current, experience: { ...current.experience, overrides } };
    });
  }

  async function saveProfile() {
    if (!profile || !snapshot || !isDirty) return;
    let validatedProfile: CandidateProfileDocument;
    try {
      validatedProfile = normalizeCandidateProfile(profile);
    } catch (error) {
      if (error instanceof CandidateProfileValidationError) {
        setIssues(error.issues);
        setSaveError("Please correct the highlighted fields.");
        focusFirstIssue(error.issues);
        return;
      }
      setSaveError(error instanceof Error ? error.message : "Profile validation failed.");
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    setIssues([]);
    setSavedFlash(false);
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: validatedProfile, expectedRevision: snapshot.revision }),
      });
      const payload = await response.json() as Partial<ProfileSnapshot> & { error?: string; issues?: string[]; code?: string };
      if (!response.ok || !payload.profile || !payload.revision) {
        const nextIssues = payload.issues ?? [];
        setIssues(nextIssues);
        focusFirstIssue(nextIssues);
        throw new Error(payload.error || (payload.code === "PROFILE_CHANGED" ? "The profile was changed by another process." : "Profile could not be saved."));
      }
      const nextSnapshot = payload as ProfileSnapshot;
      setSnapshot(nextSnapshot);
      setProfile(profileCopy(nextSnapshot.profile));
      setOriginalProfile(profileCopy(nextSnapshot.profile));
      setRawJson(JSON.stringify(nextSnapshot.profile, null, 2));
      setSavedFlash(true);
      globalThis.setTimeout(() => setSavedFlash(false), 3_000);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Profile could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <Card className="flex min-h-[360px] items-center justify-center">
        <div className="text-center">
          <LoaderCircle className="mx-auto size-8 animate-spin text-info" aria-hidden="true" />
          <p className="mt-4 text-sm font-medium text-text">Loading profile</p>
          <p className="mt-1 text-xs text-muted">Reading the local profile file.</p>
        </div>
      </Card>
    );
  }

  if (loadError || !profile || !snapshot) {
    return (
      <Card className="border-rose-400/25 bg-rose-400/5">
        <div className="flex items-start gap-4">
          <span className="rounded-2xl bg-rose-400/10 p-3 text-rose-200"><AlertTriangle className="size-6" aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-text">Profile could not be opened</h2>
            <p className="mt-2 break-words text-sm leading-6 text-rose-100">{loadError ?? "An unknown read error occurred."}</p>
            <button className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-2xl border border-line bg-black/20 px-4 text-sm font-semibold text-text" type="button" onClick={() => void loadProfile()}><RefreshCw className="size-4" aria-hidden="true" /> Try again</button>
          </div>
        </div>
      </Card>
    );
  }

  const sourceLabel = snapshot.source === "profile" ? "Active profile.json" : snapshot.source === "example" ? "Example profile loaded" : "Empty profile";
  const broadExclusionTerms = profile.targeting.disallowedRoleKeywords.filter((value) => BROAD_EXCLUSION_KEYS.has(normalizeProfileComparisonKey(value)));
  const uniqueHybridCityCount = new Set(profile.locations.allowedHybrid.map(normalizeProfileComparisonKey)).size;
  const excludedLocationKeys = new Set(profile.locations.excluded.map(normalizeProfileComparisonKey));
  const conflictingLocationNames = profile.locations.preferred.filter((value) => excludedLocationKeys.has(normalizeProfileComparisonKey(value)));
  const regionalSponsorshipValues = Object.values(profile.authorization.regional);
  const authorizationWarning = profile.authorization.workAuthorizationStatus === "authorized" && regionalSponsorshipValues.some((value) => value === true)
    ? "The general status says ‘authorized to work,’ but at least one region requires sponsorship. Keep it if that regional exception is correct."
    : profile.authorization.workAuthorizationStatus === "requires-sponsorship" && regionalSponsorshipValues.length > 0 && regionalSponsorshipValues.every((value) => value === false)
      ? "The general status says ‘sponsorship required,’ but every region says ‘no.’ Confirm that these values are correct together."
      : null;

  return (
    <ValidationBoundary issues={issues}>
    <div className="space-y-5">
      <Card className="overflow-hidden border-violet-400/20 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.16),transparent_35%),linear-gradient(135deg,rgba(17,24,39,0.98),rgba(15,23,42,0.9))]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400/25 to-fuchsia-400/15 text-violet-200 ring-1 ring-violet-300/20"><Sparkles className="size-6" aria-hidden="true" /></span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-lg font-semibold text-text">Your career profile is ready</p>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-200">{sourceLabel}</span>
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Edit the local profile file used for role matching and application answers.</p>
              <p className="mt-2 break-all font-mono text-xs text-slate-500">{snapshot.profilePath}</p>
            </div>
          </div>
          <div className="grid shrink-0 grid-cols-2 gap-3 text-sm lg:min-w-[310px]">
            <div className="rounded-2xl border border-line bg-black/20 p-3"><p className="text-xs text-muted">Last updated</p><p className="mt-1 text-text">{formatUpdatedAt(snapshot.updatedAt)}</p></div>
            <div className="rounded-2xl border border-line bg-black/20 p-3"><p className="text-xs text-muted">Status</p><p className={`mt-1 ${isDirty ? "text-amber-200" : "text-emerald-200"}`}>{isDirty ? `${changedSections.length} sections changed` : "Up to date"}</p></div>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-3">
          <Card className="p-3">
            <div className="grid gap-1" role="tablist" aria-label="Profile sections">
              {SECTION_OPTIONS.map((section) => {
                const Icon = section.icon;
                const active = section.id === activeSection;
                const tones: Record<string, string> = {
                  violet: "bg-violet-400/10 text-violet-200",
                  emerald: "bg-emerald-400/10 text-emerald-200",
                  blue: "bg-blue-400/10 text-blue-200",
                  amber: "bg-amber-400/10 text-amber-200",
                  cyan: "bg-cyan-400/10 text-cyan-200",
                  rose: "bg-rose-400/10 text-rose-200",
                  slate: "bg-slate-400/10 text-slate-200",
                };
                return (
                  <button
                    key={section.id}
                    aria-controls={`profile-panel-${section.id}`}
                    aria-selected={active}
                    className={`flex min-h-16 w-full items-center gap-3 rounded-2xl px-3 py-2 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-blue-400 ${active ? "bg-white/8 ring-1 ring-slate-500/30" : "hover:bg-white/5"}`}
                    id={`profile-tab-${section.id}`}
                    role="tab"
                    type="button"
                    onClick={() => openSection(section.id)}
                  >
                    <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tones[section.tone]}`}><Icon className="size-5" aria-hidden="true" /></span>
                    <span className="min-w-0"><span className="block text-sm font-medium text-text">{section.label}</span><span className="mt-0.5 block text-xs text-muted">{section.detail}</span></span>
                  </button>
                );
              })}
            </div>
          </Card>

          <div className="rounded-3xl border border-violet-400/15 bg-gradient-to-br from-violet-400/10 to-fuchsia-400/5 p-5">
            <div className="flex items-center gap-2 text-violet-200"><Braces className="size-4" aria-hidden="true" /><p className="text-xs font-semibold uppercase tracking-[0.2em]">Lossless editing</p></div>
            <p className="mt-3 text-xs leading-5 text-muted">New or custom JSON fields that are not shown in the form are preserved when you save. Use Advanced JSON for full control.</p>
          </div>
        </aside>

        <div className="min-w-0">
          {activeSection === "targets" ? (
            <div id="profile-panel-targets" role="tabpanel" aria-labelledby="profile-tab-targets" className="space-y-5">
              <SectionCard eyebrow="Basic profile" title="Experience and target roles" subtitle="Enter your actual years of experience and order target roles by priority.">
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Total years of experience" help="Zero or greater; decimal values such as half-years are supported." path="experience.years"><div className="relative"><input aria-label="Total years of experience" className={`${INPUT_CLASS} pr-14`} min="0" step="0.5" type="number" value={profile.experience.years} onChange={(event) => updateProfile((current) => ({ ...current, experience: { ...current.experience, years: Number(event.target.value) } }))} /><span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs font-medium text-muted">years</span></div></Field>
                  <div className="rounded-2xl border border-blue-400/15 bg-blue-400/5 p-4"><p className="text-sm font-medium text-blue-100">Role order matters</p><p className="mt-1 text-xs leading-5 text-muted">The first role is treated as the primary target. Use the arrows to reorder.</p></div>
                </div>
                <TagEditor ordered label="Preferred roles" help="The first role is the strongest matching signal." path="targeting.preferredRoles" placeholder="e.g. Platform Engineer" values={profile.targeting.preferredRoles} onChange={(preferredRoles) => updateProfile((current) => ({ ...current, targeting: { ...current.targeting, preferredRoles } }))} />
              </SectionCard>

              <SectionCard eyebrow="Technology compass" title="Technologies you know and want to learn" subtitle="Keep current skills separate from growth goals.">
                <TagEditor label="Preferred tech stack" path="targeting.preferredTechStack" placeholder="Search or add multiple values separated by commas" suggestions={TECH_SUGGESTIONS} values={profile.targeting.preferredTechStack} onChange={(preferredTechStack) => updateProfile((current) => ({ ...current, targeting: { ...current.targeting, preferredTechStack } }))} />
                <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4">
                  <TagEditor label="Learning goals" help="This field keeps growth goals in a separate list." path="targeting.aspirationalTechStack" placeholder="Search or add multiple values separated by commas" suggestions={TECH_SUGGESTIONS} tone="success" values={profile.targeting.aspirationalTechStack} onChange={(aspirationalTechStack) => updateProfile((current) => ({ ...current, targeting: { ...current.targeting, aspirationalTechStack } }))} />
                </div>
              </SectionCard>

              <SectionCard eyebrow="Matching rules" title="Role signals and exclusion lists" subtitle="Manage supporting and blocking terms found in job descriptions.">
                <details className="group rounded-2xl border border-line bg-black/15 p-4">
                  <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-text outline-none focus-visible:ring-2 focus-visible:ring-blue-400">Advanced matching signals <ChevronDown className="size-4 text-muted transition group-open:rotate-180" aria-hidden="true" /></summary>
                  <div className="mt-4"><TagEditor label="Role overlap signals" path="targeting.preferredRoleOverlapSignals" placeholder="e.g. API, microservices" values={profile.targeting.preferredRoleOverlapSignals} onChange={(preferredRoleOverlapSignals) => updateProfile((current) => ({ ...current, targeting: { ...current.targeting, preferredRoleOverlapSignals } }))} /></div>
                </details>
                <TagEditor label="Excluded roles" path="targeting.excludedRoles" placeholder="e.g. Staff, Principal" tone="warning" values={profile.targeting.excludedRoles} onChange={(excludedRoles) => updateProfile((current) => ({ ...current, targeting: { ...current.targeting, excludedRoles } }))} />
                <TagEditor label="Disallowed role keywords" path="targeting.disallowedRoleKeywords" placeholder="e.g. SAP, Android" tone="danger" values={profile.targeting.disallowedRoleKeywords} onChange={(disallowedRoleKeywords) => updateProfile((current) => ({ ...current, targeting: { ...current.targeting, disallowedRoleKeywords } }))} />
                {broadExclusionTerms.length > 0 ? <div className="flex items-start gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 text-amber-100"><AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" /><div><p className="text-sm font-semibold">Broad exclusion terms</p><p className="mt-1 text-xs leading-5">{broadExclusionTerms.join(", ")} are short or broad terms and may exclude suitable jobs. Check how they could appear in a job description before saving.</p></div></div> : null}
                <p className="rounded-2xl border border-line bg-black/15 p-4 text-xs leading-5 text-muted">Summary: {profile.targeting.excludedRoles.length} excluded roles and {profile.targeting.disallowedRoleKeywords.length} keyword exclusion rules.</p>
              </SectionCard>

              <SectionCard eyebrow="Fine tuning" title="Technology experience overrides" subtitle="Set a technology-specific value when it differs from total experience.">
                <div className="grid gap-3">
                  {Object.entries(profile.experience.overrides).map(([technology, years]) => (
                    <div key={technology} className="grid gap-3 rounded-2xl border border-line bg-black/20 p-3 sm:grid-cols-[minmax(0,1fr)_150px_44px] sm:items-center" data-profile-path="experience.overrides">
                      <input aria-label="Technology" className={INPUT_CLASS} value={technology} onChange={(event) => renameOverride(technology, event.target.value, years)} />
                      <div className="relative"><input aria-label={`${technology} years of experience`} className={`${INPUT_CLASS} pr-12`} min="0" step="0.5" type="number" value={years} onChange={(event) => updateProfile((current) => ({ ...current, experience: { ...current.experience, overrides: { ...current.experience.overrides, [technology]: Number(event.target.value) } } }))} /><span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted">years</span></div>
                      <button aria-label={`Remove ${technology} override`} className="flex size-11 items-center justify-center rounded-xl border border-line text-muted hover:border-rose-400/30 hover:text-rose-200" type="button" onClick={() => updateProfile((current) => { const overrides = { ...current.experience.overrides }; delete overrides[technology]; return { ...current, experience: { ...current.experience, overrides } }; })}><X className="size-4" /></button>
                    </div>
                  ))}
                  {issuesForPath(issues, "experience.overrides").map((issue) => <p key={issue} className="text-xs leading-5 text-rose-200" role="alert">{profileIssueMessage(issue)}</p>)}
                  <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-dashed border-line text-sm font-semibold text-muted transition hover:border-blue-400/40 hover:text-blue-200" type="button" onClick={() => updateProfile((current) => { const technology = nextOverrideName(current.experience.overrides); return { ...current, experience: { ...current.experience, overrides: { ...current.experience.overrides, [technology]: 0 } } }; })}><Plus className="size-4" aria-hidden="true" /> Add technology experience</button>
                </div>
              </SectionCard>
            </div>
          ) : null}

          {activeSection === "locations" ? (
            <div id="profile-panel-locations" role="tabpanel" aria-labelledby="profile-tab-locations" className="space-y-5">
              <SectionCard eyebrow="Work model" title="Where and how do you want to work?" subtitle="Choose one primary work model and manage the remote-only filter separately.">
                <fieldset className="space-y-3" data-profile-path="locations.remotePreference">
                  <legend className="text-sm font-medium text-text">Work model</legend>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {([
                      ["remote", "Remote"], ["hybrid", "Hybrid"], ["onsite", "On-site"], ["flexible", "Flexible"],
                    ] as Array<[RemotePreference, string]>).map(([value, label]) => (
                      <label key={value} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border px-4 transition focus-within:ring-2 focus-within:ring-blue-400 ${profile.locations.remotePreference === value ? "border-blue-400 bg-blue-400/10 text-blue-100" : "border-line bg-black/20 text-muted"}`}>
                        <input checked={profile.locations.remotePreference === value} className="size-4 accent-blue-400" name="remotePreference" type="radio" onChange={() => updateProfile((current) => ({ ...current, locations: { ...current.locations, remotePreference: value } }))} />
                        <span className="text-sm font-medium">{label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="flex min-h-16 cursor-pointer items-center justify-between gap-4 rounded-2xl border border-line bg-black/20 p-4 focus-within:ring-2 focus-within:ring-blue-400" data-profile-path="locations.remoteOnly">
                  <span><span className="block text-sm font-medium text-text">Remote-only jobs</span><span className="mt-1 block text-xs leading-5 text-muted">When enabled, non-remote jobs are filtered out.</span></span>
                  <input checked={profile.locations.remoteOnly} className="size-5 accent-blue-400" type="checkbox" onChange={(event) => updateProfile((current) => ({ ...current, locations: { ...current.locations, remoteOnly: event.target.checked } }))} />
                </label>
                {profile.locations.remoteOnly && profile.locations.allowedHybrid.length > 0 ? <p className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-xs leading-5 text-amber-100">Your hybrid cities remain saved; while “remote only” is enabled, the remote filter takes priority.</p> : null}
              </SectionCard>

              <SectionCard eyebrow="Regions" title="Preferred and excluded locations" subtitle="Add the locations you want to see instead of entering spelling variants separately.">
                <TagEditor label="Preferred locations" path="locations.preferred" placeholder="e.g. Remote, Europe" tone="success" values={profile.locations.preferred} onChange={(preferred) => updateProfile((current) => ({ ...current, locations: { ...current.locations, preferred } }))} />
                <TagEditor label="Excluded locations" path="locations.excluded" placeholder="e.g. Istanbul on-site" tone="danger" values={profile.locations.excluded} onChange={(excluded) => updateProfile((current) => ({ ...current, locations: { ...current.locations, excluded } }))} />
                {conflictingLocationNames.length > 0 ? <div className="flex items-start gap-3 rounded-2xl border border-rose-400/25 bg-rose-400/10 p-4 text-rose-100" role="alert"><AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" /><p className="text-xs leading-5">{conflictingLocationNames.join(", ")} appear in both preferred and excluded locations. Remove each location from one list before saving.</p></div> : null}
                <TagEditor label={`Hybrid-friendly cities · ${uniqueHybridCityCount} unique ${uniqueHybridCityCount === 1 ? "city" : "cities"}`} help="Diacritic and case variants are treated as the same city." path="locations.allowedHybrid" placeholder="e.g. Ankara" values={profile.locations.allowedHybrid} onChange={(allowedHybrid) => updateProfile((current) => ({ ...current, locations: { ...current.locations, allowedHybrid } }))} />
                <TagEditor label="Locations that bypass the work model rule" help="This list is used by advanced matching behavior." path="locations.workplacePolicyBypass" placeholder="e.g. Europe" values={profile.locations.workplacePolicyBypass} onChange={(workplacePolicyBypass) => updateProfile((current) => ({ ...current, locations: { ...current.locations, workplacePolicyBypass } }))} />
              </SectionCard>
            </div>
          ) : null}

          {activeSection === "authorization" ? (
            <div id="profile-panel-authorization" role="tabpanel" aria-labelledby="profile-tab-authorization" className="space-y-5">
              <SectionCard eyebrow="Application answers" title="Visa and work authorization" subtitle="These values may be used to answer work authorization and sponsorship questions.">
                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100"><strong className="font-semibold">Review:</strong> Make sure this information is accurate and current. The UI does not add approval or sharing rules beyond backend behavior.</div>
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Visa requirement" path="authorization.visaRequirement"><select className={SELECT_CLASS} value={profile.authorization.visaRequirement} onChange={(event) => updateProfile((current) => ({ ...current, authorization: { ...current.authorization, visaRequirement: event.target.value as VisaRequirement } }))}><option value="unknown">Unknown</option><option value="not-required">Not required</option><option value="required">Required</option></select></Field>
                  <Field label="Work authorization status" path="authorization.workAuthorizationStatus"><select className={SELECT_CLASS} value={profile.authorization.workAuthorizationStatus} onChange={(event) => updateProfile((current) => ({ ...current, authorization: { ...current.authorization, workAuthorizationStatus: event.target.value as WorkAuthorizationStatus } }))}><option value="unknown">Unknown</option><option value="authorized">Authorized to work</option><option value="requires-sponsorship">Sponsorship required</option></select></Field>
                </div>
                {authorizationWarning ? <div className="flex items-start gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 text-amber-100"><AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" /><p className="text-xs leading-5">{authorizationWarning}</p></div> : null}
              </SectionCard>

              <SectionCard eyebrow="Regional settings" title="Sponsorship requirements" subtitle="Use yes, no, or not specified for each region.">
                <div className="grid gap-4">
                  {([
                    ["turkeyRequiresSponsorship", "Turkey"], ["europeRequiresSponsorship", "Europe"], ["defaultRequiresSponsorship", "Other regions / default"],
                  ] as const).map(([key, label]) => (
                    <div key={key} className="grid gap-3 rounded-2xl border border-line bg-black/20 p-4 sm:grid-cols-[minmax(0,1fr)_260px] sm:items-center" data-profile-path={`authorization.regional.${key}`}>
                      <div><p className="text-sm font-medium text-text">{label}</p><p className="mt-1 text-xs text-muted">Is sponsorship required?</p></div>
                      <NullableBooleanSelect ariaLabel={`${label} sponsorship requirement`} value={profile.authorization.regional[key]} onChange={(value) => updateProfile((current) => ({ ...current, authorization: { ...current.authorization, regional: { ...current.authorization.regional, [key]: value } } }))} />
                      {issuesForPath(issues, `authorization.regional.${key}`).map((issue) => <p key={issue} className="text-xs text-rose-200 sm:col-span-2" role="alert">{profileIssueMessage(issue)}</p>)}
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          ) : null}

          {activeSection === "personal" ? (
            <div id="profile-panel-personal" role="tabpanel" aria-labelledby="profile-tab-personal" className="space-y-5">
              <SectionCard eyebrow="Personal profile" title="Language and education" subtitle="Core details that may be used in application answers.">
                <TagEditor label="Languages" path="personal.languages" placeholder="e.g. Turkish, English" values={profile.personal.languages} onChange={(languages) => updateProfile((current) => ({ ...current, personal: { ...current.personal, languages } }))} />
                <div className="max-w-sm"><Field label="GPA" help="Between 0 and 4; optional." path="personal.gpa"><input className={INPUT_CLASS} max="4" min="0" step="0.01" type="number" value={profile.personal.gpa ?? ""} onChange={(event) => updateProfile((current) => ({ ...current, personal: { ...current.personal, gpa: event.target.value === "" ? null : Number(event.target.value) } }))} /></Field></div>
              </SectionCard>

              <SectionCard eyebrow="Sensitive fields" title="Demographic details" subtitle="These values may be used by the backend when generating application answers.">
                <div className="flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-amber-100"><AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" /><p className="text-sm leading-6">This screen does not add a privacy or manual approval policy. The backend may use saved values according to its existing rules.</p></div>
                <div className="grid gap-5 md:grid-cols-2">
                  {([
                    ["gender", "Gender"], ["pronouns", "Pronouns"], ["ethnicity", "Ethnicity"], ["race", "Race"], ["veteranStatus", "Veteran status"], ["sexualOrientation", "Sexual orientation"],
                  ] as const).map(([key, label]) => (
                    <Field key={key} label={label} help="Optional." path={`personal.demographics.${key}`}><input className={INPUT_CLASS} value={profile.personal.demographics[key] ?? ""} onChange={(event) => updateProfile((current) => ({ ...current, personal: { ...current.personal, demographics: { ...current.personal.demographics, [key]: nullableText(event.target.value) } } }))} /></Field>
                  ))}
                </div>
              </SectionCard>

              <SectionCard eyebrow="Health and accommodations" title="Disability details" subtitle="Edit disability types, percentages, and accommodation needs using the file’s existing structure.">
                <label className="flex min-h-16 cursor-pointer items-center justify-between gap-4 rounded-2xl border border-line bg-black/20 p-4 focus-within:ring-2 focus-within:ring-blue-400" data-profile-path="personal.disability.hasDisability"><span><span className="block text-sm font-medium text-text">Disability information provided</span><span className="mt-1 block text-xs text-muted">Turning this off removes listed disability entries; you can undo before saving.</span></span><input checked={profile.personal.disability.hasDisability} className="size-5 accent-blue-400" type="checkbox" onChange={(event) => updateProfile((current) => ({ ...current, personal: { ...current.personal, disability: { ...current.personal.disability, hasDisability: event.target.checked, disabilities: event.target.checked ? current.personal.disability.disabilities : [] } } }))} /></label>
                <div className="grid gap-3">
                  {profile.personal.disability.disabilities.map((disability, index) => (
                    <div key={index} className="rounded-2xl border border-line bg-black/20 p-4">
                      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_150px_44px]">
                        <Field label="Disability type" path={`personal.disability.disabilities[${index}].type`}><input className={INPUT_CLASS} value={disability.type} onChange={(event) => updateProfile((current) => ({ ...current, personal: { ...current.personal, disability: { ...current.personal.disability, disabilities: current.personal.disability.disabilities.map((item, itemIndex) => itemIndex === index ? { ...item, type: event.target.value } : item) } } }))} /></Field>
                        <Field label="Percentage (%)" path={`personal.disability.disabilities[${index}].percentage`}><input className={INPUT_CLASS} max="100" min="0" type="number" value={disability.percentage ?? ""} onChange={(event) => updateProfile((current) => ({ ...current, personal: { ...current.personal, disability: { ...current.personal.disability, disabilities: current.personal.disability.disabilities.map((item, itemIndex) => itemIndex === index ? { ...item, percentage: event.target.value === "" ? null : Number(event.target.value) } : item) } } }))} /></Field>
                        <button aria-label={`Remove disability entry ${index + 1}`} className="mt-auto flex size-11 items-center justify-center rounded-xl border border-line text-muted hover:border-rose-400/30 hover:text-rose-200" type="button" onClick={() => updateProfile((current) => ({ ...current, personal: { ...current.personal, disability: { ...current.personal.disability, disabilities: current.personal.disability.disabilities.filter((_, itemIndex) => itemIndex !== index) } } }))}><X className="size-4" /></button>
                      </div>
                      <div className="mt-4"><Field label="Notes" path={`personal.disability.disabilities[${index}].notes`}><input className={INPUT_CLASS} value={disability.notes ?? ""} onChange={(event) => updateProfile((current) => ({ ...current, personal: { ...current.personal, disability: { ...current.personal.disability, disabilities: current.personal.disability.disabilities.map((item, itemIndex) => itemIndex === index ? { ...item, notes: nullableText(event.target.value) } : item) } } }))} /></Field></div>
                    </div>
                  ))}
                  <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-dashed border-line text-sm font-semibold text-muted transition hover:border-blue-400/40 hover:text-blue-200" type="button" onClick={() => updateProfile((current) => ({ ...current, personal: { ...current.personal, disability: { ...current.personal.disability, hasDisability: true, disabilities: [...current.personal.disability.disabilities, { type: "", percentage: null, notes: null }] } } }))}><Plus className="size-4" aria-hidden="true" /> Add disability entry</button>
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Accommodation required?" path="personal.disability.requiresAccommodation"><NullableBooleanSelect ariaLabel="Accommodation requirement" value={profile.personal.disability.requiresAccommodation} onChange={(requiresAccommodation) => updateProfile((current) => ({ ...current, personal: { ...current.personal, disability: { ...current.personal.disability, requiresAccommodation } } }))} /></Field>
                  <Field label="Disclosure preference" path="personal.disability.disclosurePreference"><select className={SELECT_CLASS} value={profile.personal.disability.disclosurePreference} onChange={(event) => updateProfile((current) => ({ ...current, personal: { ...current.personal, disability: { ...current.personal.disability, disclosurePreference: event.target.value as DisclosurePreference } } }))}><option value="manual-review">Manual review</option><option value="disclose">Disclose</option><option value="prefer-not-to-say">Prefer not to answer</option></select></Field>
                </div>
                <Field label="Accommodation notes" path="personal.disability.accommodationNotes"><input className={INPUT_CLASS} value={profile.personal.disability.accommodationNotes ?? ""} onChange={(event) => updateProfile((current) => ({ ...current, personal: { ...current.personal, disability: { ...current.personal.disability, accommodationNotes: nullableText(event.target.value) } } }))} /></Field>
              </SectionCard>
            </div>
          ) : null}

          {activeSection === "work" ? (
            <div id="profile-panel-work" role="tabpanel" aria-labelledby="profile-tab-work" className="space-y-5">
              <SectionCard eyebrow="Compensation expectations" title="Expectations by currency" subtitle="The file stores only values; it does not assign a period or gross/net meaning.">
                <div className="grid gap-4 md:grid-cols-3">
                  {(["usd", "eur", "try"] as const).map((currency) => <Field key={currency} label={currency.toUpperCase()} path={`compensation.expectations.${currency}`}><input className={INPUT_CLASS} inputMode="decimal" value={textValue(profile.compensation.expectations[currency])} onChange={(event) => updateProfile((current) => ({ ...current, compensation: { ...current.compensation, expectations: { ...current.compensation.expectations, [currency]: nullableScalar(event.target.value) } } }))} /></Field>)}
                </div>
                <Field label="Compensation summary" help="Free-text context; specify period and gross/net details here when needed." path="compensation.summary"><textarea className={`${INPUT_CLASS} min-h-28 resize-y py-3`} value={profile.compensation.summary ?? ""} onChange={(event) => updateProfile((current) => ({ ...current, compensation: { ...current.compensation, summary: nullableText(event.target.value) } }))} /></Field>
              </SectionCard>

              <SectionCard eyebrow="Availability" title="Start details" subtitle="Manage immediate availability, notice period, and start date together.">
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Can start immediately?" path="availability.canStartImmediately"><NullableBooleanSelect ariaLabel="Immediate availability" value={profile.availability.canStartImmediately} onChange={(canStartImmediately) => updateProfile((current) => ({ ...current, availability: { ...current.availability, canStartImmediately } }))} /></Field>
                  <Field label="Notice period" path="availability.noticePeriod"><input className={INPUT_CLASS} disabled={profile.availability.canStartImmediately === true} placeholder="e.g. 30 days" value={textValue(profile.availability.noticePeriod)} onChange={(event) => updateProfile((current) => ({ ...current, availability: { ...current.availability, noticePeriod: nullableScalar(event.target.value) } }))} /></Field>
                  <Field label="Start date" help="Free text or date value." path="availability.startDate"><input className={INPUT_CLASS} disabled={profile.availability.canStartImmediately === true} placeholder="YYYY-MM-DD" value={textValue(profile.availability.startDate)} onChange={(event) => updateProfile((current) => ({ ...current, availability: { ...current.availability, startDate: nullableScalar(event.target.value) } }))} /></Field>
                </div>
                {profile.availability.canStartImmediately === true && (profile.availability.noticePeriod != null || profile.availability.startDate != null) ? <p className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-xs leading-5 text-amber-100">Immediate availability is selected. The saved notice period and start date are preserved, but these fields are currently disabled.</p> : null}
              </SectionCard>
            </div>
          ) : null}

          {activeSection === "links" ? (
            <div id="profile-panel-links" role="tabpanel" aria-labelledby="profile-tab-links" className="space-y-5">
              <SectionCard eyebrow="Professional identity" title="Profile links" subtitle="Enter full URLs, including https://.">
                <div className="grid gap-5">
                  {([ ["linkedinUrl", "LinkedIn"], ["githubUrl", "GitHub"], ["portfolioUrl", "Portfolio"] ] as const).map(([key, label]) => <div key={key}><Field label={label} path={`identity.${key}`}><input aria-label={`${label} URL`} className={INPUT_CLASS} placeholder="https://…" type="url" value={profile.identity[key] ?? ""} onChange={(event) => updateProfile((current) => ({ ...current, identity: { ...current.identity, [key]: nullableText(event.target.value) } }))} /></Field>{isOpenableUrl(profile.identity[key]) ? <a className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-blue-200 transition hover:bg-blue-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" href={profile.identity[key] ?? undefined} rel="noreferrer" target="_blank"><ExternalLink className="size-4" aria-hidden="true" /> Open</a> : null}</div>)}
                </div>
              </SectionCard>

              <SectionCard eyebrow="References" title="Professional references" subtitle="Edit the name, relationship, and full LinkedIn URL.">
                <div className="grid gap-4">
                  {profile.references.map((reference, index) => (
                    <div key={index} className="rounded-2xl border border-line bg-black/20 p-4">
                      <div className="mb-4 flex items-center justify-between"><p className="text-sm font-semibold text-text">Reference {index + 1}</p><button aria-label={`Remove reference ${index + 1}`} className="flex size-11 items-center justify-center rounded-xl text-muted hover:bg-rose-400/10 hover:text-rose-200" type="button" onClick={() => updateProfile((current) => ({ ...current, references: current.references.filter((_, itemIndex) => itemIndex !== index) }))}><X className="size-4" /></button></div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Name" path={`references[${index}].name`}><input className={INPUT_CLASS} value={reference.name} onChange={(event) => updateProfile((current) => ({ ...current, references: current.references.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item) }))} /></Field>
                        <Field label="Relationship" path={`references[${index}].relationship`}><input className={INPUT_CLASS} placeholder="e.g. Former team lead" value={reference.relationship ?? ""} onChange={(event) => updateProfile((current) => ({ ...current, references: current.references.map((item, itemIndex) => itemIndex === index ? { ...item, relationship: nullableText(event.target.value) } : item) }))} /></Field>
                        <div className="md:col-span-2"><Field label="LinkedIn URL" path={`references[${index}].linkedinUrl`}><input className={INPUT_CLASS} placeholder="https://www.linkedin.com/in/…" type="url" value={reference.linkedinUrl} onChange={(event) => updateProfile((current) => ({ ...current, references: current.references.map((item, itemIndex) => itemIndex === index ? { ...item, linkedinUrl: event.target.value } : item) }))} /></Field>{isOpenableUrl(reference.linkedinUrl) ? <a className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-blue-200 transition hover:bg-blue-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" href={reference.linkedinUrl} rel="noreferrer" target="_blank"><ExternalLink className="size-4" aria-hidden="true" /> Open</a> : null}</div>
                      </div>
                    </div>
                  ))}
                  <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-dashed border-line text-sm font-semibold text-muted transition hover:border-blue-400/40 hover:text-blue-200" type="button" onClick={() => updateProfile((current) => ({ ...current, references: [...current.references, { name: "", linkedinUrl: "", relationship: null }] }))}><Plus className="size-4" aria-hidden="true" /> Add reference</button>
                </div>
              </SectionCard>
            </div>
          ) : null}

          {activeSection === "advanced" ? (
            <div id="profile-panel-advanced" role="tabpanel" aria-labelledby="profile-tab-advanced" className="space-y-5">
              <SectionCard eyebrow="Advanced" title="Complete profile JSON" subtitle="Use this to view or edit fields that are not shown in the form.">
                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">Changes here are validated and applied to the form first. To write them to the file, you must also select the main “Save changes” button.</div>
                <label className="space-y-2"><span className="text-sm font-medium text-text">profile.json</span><textarea className="min-h-[620px] w-full resize-y rounded-2xl border border-line bg-black/40 p-4 font-mono text-xs leading-6 text-slate-200 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20" spellCheck={false} value={rawJson} onChange={(event) => { setRawJson(event.target.value); setRawError(null); }} /></label>
                {rawError ? <div className="rounded-2xl border border-rose-400/25 bg-rose-400/10 p-4 text-sm leading-6 text-rose-100" role="alert">{rawError}</div> : null}
                <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-blue-400/30 bg-blue-400/10 px-5 text-sm font-semibold text-blue-100 transition hover:bg-blue-400/15" type="button" onClick={applyRawJson}><Braces className="size-4" aria-hidden="true" /> Apply JSON to form</button>
              </SectionCard>
            </div>
          ) : null}
        </div>
      </div>

      {(saveError || issues.length > 0) ? (
        <div className="rounded-3xl border border-rose-400/25 bg-rose-400/10 p-5 text-rose-100" role="alert">
          <div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" /><div><p className="font-semibold">Profile could not be saved</p><p className="mt-1 text-sm leading-6">{saveError}</p>{issues.length > 0 ? <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{issues.map((issue) => <li key={issue}>{profileIssueMessage(issue)}</li>)}</ul> : null}</div></div>
          <button className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-300/20 px-4 text-sm font-semibold" type="button" onClick={() => void loadProfile()}><RefreshCw className="size-4" aria-hidden="true" /> Reload file</button>
        </div>
      ) : null}

      <div className="sticky bottom-4 z-10 rounded-3xl border border-line bg-ink/90 p-4 shadow-panel backdrop-blur-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0" aria-live="polite">
            {savedFlash ? <p className="flex items-center gap-2 text-sm font-semibold text-emerald-200"><CheckCircle2 className="size-4" aria-hidden="true" /> Profile saved</p> : isDirty ? <><p className="text-sm font-semibold text-amber-100">Unsaved changes</p><p className="mt-1 truncate text-xs text-muted">{changedSections.join(" · ")}</p></> : <p className="flex items-center gap-2 text-sm text-muted"><CheckCircle2 className="size-4 text-emerald-300" aria-hidden="true" /> All changes saved</p>}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-line bg-black/20 px-4 text-sm font-semibold text-text transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40" disabled={!isDirty || isSaving} type="button" onClick={resetChanges}><RotateCcw className="size-4" aria-hidden="true" /> Undo</button>
            <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-500 px-5 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40" disabled={!isDirty || isSaving} type="button" onClick={() => void saveProfile()}>{isSaving ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}{isSaving ? "Saving" : "Save changes"}</button>
          </div>
        </div>
      </div>
    </div>
    </ValidationBoundary>
  );
}
