"use client";

import {
  AlertTriangle,
  Braces,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
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
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, SectionTitle } from "@/components/ui";
import {
  CandidateProfileValidationError,
  normalizeCandidateProfile,
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
  { id: "targets", label: "Hedefler ve yetkinlikler", detail: "Deneyim, roller, teknolojiler", icon: Sprout, tone: "violet" },
  { id: "locations", label: "Konum tercihleri", detail: "Uzaktan, hibrit ve bölgeler", icon: MapPin, tone: "emerald" },
  { id: "authorization", label: "Çalışma izni", detail: "Vize ve sponsorluk", icon: ShieldCheck, tone: "blue" },
  { id: "personal", label: "Kişisel bilgiler", detail: "Dil ve başvuru yanıtları", icon: UserRound, tone: "amber" },
  { id: "work", label: "Ücret ve müsaitlik", detail: "Beklenti ve başlangıç", icon: CircleDollarSign, tone: "cyan" },
  { id: "links", label: "Bağlantılar", detail: "Profiller ve referanslar", icon: Link2, tone: "rose" },
  { id: "advanced", label: "Gelişmiş JSON", detail: "Dosyanın tamamı", icon: FileJson, tone: "slate" },
];

const SECTION_LABELS: Record<string, string> = {
  experience: "Deneyim",
  targeting: "Hedefler",
  locations: "Konumlar",
  authorization: "Çalışma izni",
  personal: "Kişisel bilgiler",
  identity: "Bağlantılar",
  compensation: "Ücret",
  availability: "Müsaitlik",
  references: "Referanslar",
};

const INPUT_CLASS = "w-full rounded-2xl border border-line bg-slate-950/75 px-4 py-3 text-sm text-text outline-none transition placeholder:text-slate-600 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20";
const SELECT_CLASS = `${INPUT_CLASS} min-h-12`;

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
  if (!value) return "Henüz yerel profil oluşturulmadı";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-2">
      <span className="block text-sm font-medium text-text">{label}</span>
      {help ? <span className="block text-xs leading-5 text-muted">{help}</span> : null}
      {children}
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
      <option value="unknown">Belirtilmedi</option>
      <option value="true">Evet</option>
      <option value="false">Hayır</option>
    </select>
  );
}

function TagEditor({
  label,
  help,
  values,
  onChange,
  placeholder,
  ordered = false,
}: {
  label: string;
  help?: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  ordered?: boolean;
}) {
  const [draft, setDraft] = useState("");

  function addValue() {
    const nextValues = draft
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .filter((value) => !values.some((existing) => existing.toLocaleLowerCase("tr") === value.toLocaleLowerCase("tr")));
    if (nextValues.length === 0) return;
    onChange([...values, ...nextValues]);
    setDraft("");
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= values.length) return;
    const next = [...values];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="space-y-3">
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
                  <button aria-label={`${value} rolünü yukarı taşı`} className="rounded-lg p-2 text-muted transition hover:bg-white/5 hover:text-text disabled:opacity-30" disabled={index === 0} type="button" onClick={() => move(index, -1)}><ChevronUp className="size-4" /></button>
                  <button aria-label={`${value} rolünü aşağı taşı`} className="rounded-lg p-2 text-muted transition hover:bg-white/5 hover:text-text disabled:opacity-30" disabled={index === values.length - 1} type="button" onClick={() => move(index, 1)}><ChevronDown className="size-4" /></button>
                  <button aria-label={`${value} değerini kaldır`} className="rounded-lg p-2 text-muted transition hover:bg-rose-400/10 hover:text-rose-200" type="button" onClick={() => onChange(values.filter((_, itemIndex) => itemIndex !== index))}><X className="size-4" /></button>
                </div>
              </div>
            ) : (
              <span key={`${value}-${index}`} className="inline-flex min-h-10 items-center gap-1 rounded-full border border-slate-500/30 bg-slate-400/10 pl-3 text-sm text-slate-100">
                {value}
                <button aria-label={`${value} değerini kaldır`} className="flex size-10 items-center justify-center rounded-full text-muted transition hover:bg-rose-400/10 hover:text-rose-200" type="button" onClick={() => onChange(values.filter((_, itemIndex) => itemIndex !== index))}><X className="size-4" /></button>
              </span>
            )
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-line bg-black/10 px-4 py-5 text-sm text-muted">Henüz değer eklenmedi.</div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          aria-label={`${label} için yeni değer`}
          className={INPUT_CLASS}
          placeholder={placeholder}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addValue();
            }
          }}
        />
        <button className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl border border-line bg-white/5 px-4 text-sm font-semibold text-text transition hover:border-slate-500 hover:bg-white/10" type="button" onClick={addValue}>
          <Plus className="size-4" aria-hidden="true" /> Ekle
        </button>
      </div>
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
        throw new Error(payload.issues?.join(" ") || payload.error || "Profil yüklenemedi.");
      }
      const nextSnapshot = payload as ProfileSnapshot;
      setSnapshot(nextSnapshot);
      setProfile(profileCopy(nextSnapshot.profile));
      setOriginalProfile(profileCopy(nextSnapshot.profile));
      setRawJson(JSON.stringify(nextSnapshot.profile, null, 2));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Profil yüklenemedi.");
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
        setRawError(error instanceof Error ? error.message : "JSON geçersiz.");
      }
    }
  }

  async function saveProfile() {
    if (!profile || !snapshot || !isDirty) return;
    setIsSaving(true);
    setSaveError(null);
    setIssues([]);
    setSavedFlash(false);
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, expectedRevision: snapshot.revision }),
      });
      const payload = await response.json() as Partial<ProfileSnapshot> & { error?: string; issues?: string[]; code?: string };
      if (!response.ok || !payload.profile || !payload.revision) {
        setIssues(payload.issues ?? []);
        throw new Error(payload.error || (payload.code === "PROFILE_CHANGED" ? "Profil başka bir işlem tarafından değiştirildi." : "Profil kaydedilemedi."));
      }
      const nextSnapshot = payload as ProfileSnapshot;
      setSnapshot(nextSnapshot);
      setProfile(profileCopy(nextSnapshot.profile));
      setOriginalProfile(profileCopy(nextSnapshot.profile));
      setRawJson(JSON.stringify(nextSnapshot.profile, null, 2));
      setSavedFlash(true);
      globalThis.setTimeout(() => setSavedFlash(false), 3_000);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Profil kaydedilemedi.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <Card className="flex min-h-[360px] items-center justify-center">
        <div className="text-center">
          <LoaderCircle className="mx-auto size-8 animate-spin text-info" aria-hidden="true" />
          <p className="mt-4 text-sm font-medium text-text">Profil yükleniyor</p>
          <p className="mt-1 text-xs text-muted">Yerel profil dosyası okunuyor.</p>
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
            <h2 className="text-lg font-semibold text-text">Profil açılamadı</h2>
            <p className="mt-2 break-words text-sm leading-6 text-rose-100">{loadError ?? "Bilinmeyen bir okuma hatası oluştu."}</p>
            <button className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-2xl border border-line bg-black/20 px-4 text-sm font-semibold text-text" type="button" onClick={() => void loadProfile()}><RefreshCw className="size-4" aria-hidden="true" /> Tekrar dene</button>
          </div>
        </div>
      </Card>
    );
  }

  const sourceLabel = snapshot.source === "profile" ? "Aktif profile.json" : snapshot.source === "example" ? "Örnek profil yüklendi" : "Boş profil";

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-violet-400/20 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.16),transparent_35%),linear-gradient(135deg,rgba(17,24,39,0.98),rgba(15,23,42,0.9))]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400/25 to-fuchsia-400/15 text-violet-200 ring-1 ring-violet-300/20"><Sparkles className="size-6" aria-hidden="true" /></span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-lg font-semibold text-text">Kariyer profilin hazır</p>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-200">{sourceLabel}</span>
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Rol eşleştirmesi ve başvuru cevaplarında kullanılan yerel profil dosyasını buradan düzenleyebilirsin.</p>
              <p className="mt-2 break-all font-mono text-xs text-slate-500">{snapshot.profilePath}</p>
            </div>
          </div>
          <div className="grid shrink-0 grid-cols-2 gap-3 text-sm lg:min-w-[310px]">
            <div className="rounded-2xl border border-line bg-black/20 p-3"><p className="text-xs text-muted">Son güncelleme</p><p className="mt-1 text-text">{formatUpdatedAt(snapshot.updatedAt)}</p></div>
            <div className="rounded-2xl border border-line bg-black/20 p-3"><p className="text-xs text-muted">Durum</p><p className={`mt-1 ${isDirty ? "text-amber-200" : "text-emerald-200"}`}>{isDirty ? `${changedSections.length} bölüm değişti` : "Güncel"}</p></div>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-3">
          <Card className="p-3">
            <div className="grid gap-1" role="tablist" aria-label="Profil bölümleri">
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
            <div className="flex items-center gap-2 text-violet-200"><Braces className="size-4" aria-hidden="true" /><p className="text-xs font-semibold uppercase tracking-[0.2em]">Kayıpsız düzenleme</p></div>
            <p className="mt-3 text-xs leading-5 text-muted">Formda görünmeyen yeni veya özel JSON alanları kaydetme sırasında korunur. Tam kontrol için Gelişmiş JSON bölümünü kullanabilirsin.</p>
          </div>
        </aside>

        <div className="min-w-0">
          {activeSection === "targets" ? (
            <div id="profile-panel-targets" role="tabpanel" aria-labelledby="profile-tab-targets" className="space-y-5">
              <SectionCard eyebrow="Temel profil" title="Deneyim ve hedef roller" subtitle="Gerçek deneyim yılını gir; hedef rollerini önem sırasına göre düzenle.">
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Toplam deneyim yılı" help="Sıfır veya daha büyük bir sayı."><input className={INPUT_CLASS} min="0" step="0.5" type="number" value={profile.experience.years} onChange={(event) => updateProfile((current) => ({ ...current, experience: { ...current.experience, years: Number(event.target.value) } }))} /></Field>
                  <div className="rounded-2xl border border-blue-400/15 bg-blue-400/5 p-4"><p className="text-sm font-medium text-blue-100">Rol sırası önemlidir</p><p className="mt-1 text-xs leading-5 text-muted">İlk rol birincil hedef olarak değerlendirilir. Oklarla sıralamayı değiştirebilirsin.</p></div>
                </div>
                <TagEditor ordered label="Tercih edilen roller" help="İlk sıradaki rol en güçlü eşleştirme sinyalidir." placeholder="Örn. Platform Engineer" values={profile.targeting.preferredRoles} onChange={(preferredRoles) => updateProfile((current) => ({ ...current, targeting: { ...current.targeting, preferredRoles } }))} />
              </SectionCard>

              <SectionCard eyebrow="Teknoloji pusulası" title="Bildiğin ve öğrenmek istediğin teknolojiler" subtitle="Mevcut yetkinlikleri gelişim hedeflerinden ayrı tut.">
                <TagEditor label="Tercih edilen teknoloji yığını" placeholder="Örn. Redis, NestJS" values={profile.targeting.preferredTechStack} onChange={(preferredTechStack) => updateProfile((current) => ({ ...current, targeting: { ...current.targeting, preferredTechStack } }))} />
                <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4">
                  <TagEditor label="Öğrenmek istediklerim" help="Bu alan gelişim hedeflerini ayrı bir liste olarak tutar." placeholder="Örn. Kubernetes" values={profile.targeting.aspirationalTechStack} onChange={(aspirationalTechStack) => updateProfile((current) => ({ ...current, targeting: { ...current.targeting, aspirationalTechStack } }))} />
                </div>
              </SectionCard>

              <SectionCard eyebrow="Eşleştirme kuralları" title="Rol sinyalleri ve eleme listeleri" subtitle="İlan metnindeki destekleyici veya engelleyici kelimeleri yönet.">
                <TagEditor label="Rol örtüşme sinyalleri" placeholder="Örn. API, microservices" values={profile.targeting.preferredRoleOverlapSignals} onChange={(preferredRoleOverlapSignals) => updateProfile((current) => ({ ...current, targeting: { ...current.targeting, preferredRoleOverlapSignals } }))} />
                <TagEditor label="Hariç tutulan roller" placeholder="Örn. Staff, Principal" values={profile.targeting.excludedRoles} onChange={(excludedRoles) => updateProfile((current) => ({ ...current, targeting: { ...current.targeting, excludedRoles } }))} />
                <TagEditor label="İzin verilmeyen rol anahtarları" placeholder="Örn. SAP, Android" values={profile.targeting.disallowedRoleKeywords} onChange={(disallowedRoleKeywords) => updateProfile((current) => ({ ...current, targeting: { ...current.targeting, disallowedRoleKeywords } }))} />
              </SectionCard>

              <SectionCard eyebrow="İnce ayar" title="Teknoloji deneyimi düzeltmeleri" subtitle="Belirli bir teknoloji için toplam deneyimden farklı bir yıl değeri kullan.">
                <div className="grid gap-3">
                  {Object.entries(profile.experience.overrides).map(([technology, years]) => (
                    <div key={technology} className="grid gap-3 rounded-2xl border border-line bg-black/20 p-3 sm:grid-cols-[minmax(0,1fr)_130px_44px] sm:items-center">
                      <input aria-label="Teknoloji" className={INPUT_CLASS} value={technology} onChange={(event) => updateProfile((current) => { const overrides = { ...current.experience.overrides }; delete overrides[technology]; overrides[event.target.value] = years; return { ...current, experience: { ...current.experience, overrides } }; })} />
                      <input aria-label={`${technology} deneyim yılı`} className={INPUT_CLASS} min="0" step="0.5" type="number" value={years} onChange={(event) => updateProfile((current) => ({ ...current, experience: { ...current.experience, overrides: { ...current.experience.overrides, [technology]: Number(event.target.value) } } }))} />
                      <button aria-label={`${technology} düzeltmesini kaldır`} className="flex size-11 items-center justify-center rounded-xl border border-line text-muted hover:border-rose-400/30 hover:text-rose-200" type="button" onClick={() => updateProfile((current) => { const overrides = { ...current.experience.overrides }; delete overrides[technology]; return { ...current, experience: { ...current.experience, overrides } }; })}><X className="size-4" /></button>
                    </div>
                  ))}
                  <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-dashed border-line text-sm font-semibold text-muted transition hover:border-blue-400/40 hover:text-blue-200" type="button" onClick={() => updateProfile((current) => ({ ...current, experience: { ...current.experience, overrides: { ...current.experience.overrides, "Yeni teknoloji": 0 } } }))}><Plus className="size-4" aria-hidden="true" /> Teknoloji deneyimi ekle</button>
                </div>
              </SectionCard>
            </div>
          ) : null}

          {activeSection === "locations" ? (
            <div id="profile-panel-locations" role="tabpanel" aria-labelledby="profile-tab-locations" className="space-y-5">
              <SectionCard eyebrow="Çalışma modeli" title="Nerede ve nasıl çalışmak istiyorsun?" subtitle="Tek bir ana çalışma modeli seç; sadece uzaktan filtresini ayrıca yönet.">
                <fieldset className="space-y-3">
                  <legend className="text-sm font-medium text-text">Çalışma modeli</legend>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {([
                      ["remote", "Uzaktan"], ["hybrid", "Hibrit"], ["onsite", "Ofis"], ["flexible", "Esnek"],
                    ] as Array<[RemotePreference, string]>).map(([value, label]) => (
                      <label key={value} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border px-4 transition focus-within:ring-2 focus-within:ring-blue-400 ${profile.locations.remotePreference === value ? "border-blue-400 bg-blue-400/10 text-blue-100" : "border-line bg-black/20 text-muted"}`}>
                        <input checked={profile.locations.remotePreference === value} className="size-4 accent-blue-400" name="remotePreference" type="radio" onChange={() => updateProfile((current) => ({ ...current, locations: { ...current.locations, remotePreference: value } }))} />
                        <span className="text-sm font-medium">{label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="flex min-h-16 cursor-pointer items-center justify-between gap-4 rounded-2xl border border-line bg-black/20 p-4 focus-within:ring-2 focus-within:ring-blue-400">
                  <span><span className="block text-sm font-medium text-text">Yalnızca uzaktan ilanlar</span><span className="mt-1 block text-xs leading-5 text-muted">Açık olduğunda uzaktan olmayan ilanlar filtrelenir.</span></span>
                  <input checked={profile.locations.remoteOnly} className="size-5 accent-blue-400" type="checkbox" onChange={(event) => updateProfile((current) => ({ ...current, locations: { ...current.locations, remoteOnly: event.target.checked } }))} />
                </label>
                {profile.locations.remoteOnly && profile.locations.allowedHybrid.length > 0 ? <p className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-xs leading-5 text-amber-100">Hibrit şehirlerin kayıtlı kalır; “yalnızca uzaktan” açık olduğu sürece uzaktan filtresi önceliklidir.</p> : null}
              </SectionCard>

              <SectionCard eyebrow="Bölgeler" title="Tercih edilen ve hariç tutulan konumlar" subtitle="Yazım varyasyonlarını tek tek girmek yerine kullanıcıya göstermek istediğin gerçek konumları ekle.">
                <TagEditor label="Tercih edilen konumlar" placeholder="Örn. Remote, Europe" values={profile.locations.preferred} onChange={(preferred) => updateProfile((current) => ({ ...current, locations: { ...current.locations, preferred } }))} />
                <TagEditor label="Hariç tutulan konumlar" placeholder="Örn. Istanbul onsite" values={profile.locations.excluded} onChange={(excluded) => updateProfile((current) => ({ ...current, locations: { ...current.locations, excluded } }))} />
                <TagEditor label="Hibrit çalışılabilecek şehirler" placeholder="Örn. Ankara" values={profile.locations.allowedHybrid} onChange={(allowedHybrid) => updateProfile((current) => ({ ...current, locations: { ...current.locations, allowedHybrid } }))} />
                <TagEditor label="Çalışma modeli kuralını atlayan konumlar" help="Bu liste gelişmiş eşleştirme davranışında kullanılır." placeholder="Örn. Europe" values={profile.locations.workplacePolicyBypass} onChange={(workplacePolicyBypass) => updateProfile((current) => ({ ...current, locations: { ...current.locations, workplacePolicyBypass } }))} />
              </SectionCard>
            </div>
          ) : null}

          {activeSection === "authorization" ? (
            <div id="profile-panel-authorization" role="tabpanel" aria-labelledby="profile-tab-authorization" className="space-y-5">
              <SectionCard eyebrow="Başvuru cevapları" title="Vize ve çalışma izni" subtitle="Bu değerler çalışma izni ve sponsorluk sorularına yanıt üretirken kullanılabilir.">
                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100"><strong className="font-semibold">Kontrol et:</strong> Buradaki bilgilerin doğru ve güncel olduğundan emin ol. Arayüz, backend davranışına ek bir onay veya paylaşım kuralı getirmez.</div>
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Vize gereksinimi"><select className={SELECT_CLASS} value={profile.authorization.visaRequirement} onChange={(event) => updateProfile((current) => ({ ...current, authorization: { ...current.authorization, visaRequirement: event.target.value as VisaRequirement } }))}><option value="unknown">Bilinmiyor</option><option value="not-required">Gerekmiyor</option><option value="required">Gerekiyor</option></select></Field>
                  <Field label="Çalışma izni durumu"><select className={SELECT_CLASS} value={profile.authorization.workAuthorizationStatus} onChange={(event) => updateProfile((current) => ({ ...current, authorization: { ...current.authorization, workAuthorizationStatus: event.target.value as WorkAuthorizationStatus } }))}><option value="unknown">Bilinmiyor</option><option value="authorized">Çalışma iznim var</option><option value="requires-sponsorship">Sponsorluk gerekiyor</option></select></Field>
                </div>
              </SectionCard>

              <SectionCard eyebrow="Bölgesel ayarlar" title="Sponsorluk gereksinimi" subtitle="Her bölge için evet, hayır veya belirtilmedi seçeneğini kullan.">
                <div className="grid gap-4">
                  {([
                    ["turkeyRequiresSponsorship", "Türkiye"], ["europeRequiresSponsorship", "Avrupa"], ["defaultRequiresSponsorship", "Diğer bölgeler / varsayılan"],
                  ] as const).map(([key, label]) => (
                    <div key={key} className="grid gap-3 rounded-2xl border border-line bg-black/20 p-4 sm:grid-cols-[minmax(0,1fr)_260px] sm:items-center">
                      <div><p className="text-sm font-medium text-text">{label}</p><p className="mt-1 text-xs text-muted">Sponsorluk gerekiyor mu?</p></div>
                      <NullableBooleanSelect ariaLabel={`${label} sponsorluk gereksinimi`} value={profile.authorization.regional[key]} onChange={(value) => updateProfile((current) => ({ ...current, authorization: { ...current.authorization, regional: { ...current.authorization.regional, [key]: value } } }))} />
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          ) : null}

          {activeSection === "personal" ? (
            <div id="profile-panel-personal" role="tabpanel" aria-labelledby="profile-tab-personal" className="space-y-5">
              <SectionCard eyebrow="Kişisel profil" title="Dil ve eğitim bilgileri" subtitle="Başvuru sorularında kullanılabilecek temel bilgiler.">
                <TagEditor label="Diller" placeholder="Örn. Turkish, English" values={profile.personal.languages} onChange={(languages) => updateProfile((current) => ({ ...current, personal: { ...current.personal, languages } }))} />
                <div className="max-w-sm"><Field label="Not ortalaması" help="0–4 aralığında; boş bırakılabilir."><input className={INPUT_CLASS} max="4" min="0" step="0.01" type="number" value={profile.personal.gpa ?? ""} onChange={(event) => updateProfile((current) => ({ ...current, personal: { ...current.personal, gpa: event.target.value === "" ? null : Number(event.target.value) } }))} /></Field></div>
              </SectionCard>

              <SectionCard eyebrow="Hassas alanlar" title="Demografik bilgiler" subtitle="Bu değerler backend tarafından başvuru cevapları oluşturulurken kullanılabilir.">
                <div className="flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-amber-100"><AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" /><p className="text-sm leading-6">Bu ekran ek bir mahremiyet veya manuel onay politikası uygulamaz. Kaydettiğin değerleri backend mevcut kurallarına göre kullanabilir.</p></div>
                <div className="grid gap-5 md:grid-cols-2">
                  {([
                    ["gender", "Cinsiyet"], ["pronouns", "Hitap / zamir"], ["ethnicity", "Etnik köken"], ["race", "Irk"], ["veteranStatus", "Veteran durumu"], ["sexualOrientation", "Cinsel yönelim"],
                  ] as const).map(([key, label]) => (
                    <Field key={key} label={label} help="Boş bırakılabilir."><input className={INPUT_CLASS} value={profile.personal.demographics[key] ?? ""} onChange={(event) => updateProfile((current) => ({ ...current, personal: { ...current.personal, demographics: { ...current.personal.demographics, [key]: nullableText(event.target.value) } } }))} /></Field>
                  ))}
                </div>
              </SectionCard>

              <SectionCard eyebrow="Sağlık ve düzenleme" title="Engellilik bilgileri" subtitle="Engel türlerini, oranları ve düzenleme ihtiyacını dosyadaki yapısıyla düzenle.">
                <label className="flex min-h-16 cursor-pointer items-center justify-between gap-4 rounded-2xl border border-line bg-black/20 p-4 focus-within:ring-2 focus-within:ring-blue-400"><span><span className="block text-sm font-medium text-text">Engellilik bilgisi var</span><span className="mt-1 block text-xs text-muted">Kapatıldığında listedeki engel kayıtları kaldırılır; kaydetmeden önce geri alabilirsin.</span></span><input checked={profile.personal.disability.hasDisability} className="size-5 accent-blue-400" type="checkbox" onChange={(event) => updateProfile((current) => ({ ...current, personal: { ...current.personal, disability: { ...current.personal.disability, hasDisability: event.target.checked, disabilities: event.target.checked ? current.personal.disability.disabilities : [] } } }))} /></label>
                <div className="grid gap-3">
                  {profile.personal.disability.disabilities.map((disability, index) => (
                    <div key={index} className="rounded-2xl border border-line bg-black/20 p-4">
                      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_150px_44px]">
                        <Field label="Engel türü"><input className={INPUT_CLASS} value={disability.type} onChange={(event) => updateProfile((current) => ({ ...current, personal: { ...current.personal, disability: { ...current.personal.disability, disabilities: current.personal.disability.disabilities.map((item, itemIndex) => itemIndex === index ? { ...item, type: event.target.value } : item) } } }))} /></Field>
                        <Field label="Oran (%)"><input className={INPUT_CLASS} max="100" min="0" type="number" value={disability.percentage ?? ""} onChange={(event) => updateProfile((current) => ({ ...current, personal: { ...current.personal, disability: { ...current.personal.disability, disabilities: current.personal.disability.disabilities.map((item, itemIndex) => itemIndex === index ? { ...item, percentage: event.target.value === "" ? null : Number(event.target.value) } : item) } } }))} /></Field>
                        <button aria-label={`${index + 1}. engel kaydını kaldır`} className="mt-auto flex size-11 items-center justify-center rounded-xl border border-line text-muted hover:border-rose-400/30 hover:text-rose-200" type="button" onClick={() => updateProfile((current) => ({ ...current, personal: { ...current.personal, disability: { ...current.personal.disability, disabilities: current.personal.disability.disabilities.filter((_, itemIndex) => itemIndex !== index) } } }))}><X className="size-4" /></button>
                      </div>
                      <div className="mt-4"><Field label="Not"><input className={INPUT_CLASS} value={disability.notes ?? ""} onChange={(event) => updateProfile((current) => ({ ...current, personal: { ...current.personal, disability: { ...current.personal.disability, disabilities: current.personal.disability.disabilities.map((item, itemIndex) => itemIndex === index ? { ...item, notes: nullableText(event.target.value) } : item) } } }))} /></Field></div>
                    </div>
                  ))}
                  <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-dashed border-line text-sm font-semibold text-muted transition hover:border-blue-400/40 hover:text-blue-200" type="button" onClick={() => updateProfile((current) => ({ ...current, personal: { ...current.personal, disability: { ...current.personal.disability, hasDisability: true, disabilities: [...current.personal.disability.disabilities, { type: "", percentage: null, notes: null }] } } }))}><Plus className="size-4" aria-hidden="true" /> Engel kaydı ekle</button>
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Düzenleme gerekiyor mu?"><NullableBooleanSelect ariaLabel="Düzenleme gereksinimi" value={profile.personal.disability.requiresAccommodation} onChange={(requiresAccommodation) => updateProfile((current) => ({ ...current, personal: { ...current.personal, disability: { ...current.personal.disability, requiresAccommodation } } }))} /></Field>
                  <Field label="Paylaşım tercihi"><select className={SELECT_CLASS} value={profile.personal.disability.disclosurePreference} onChange={(event) => updateProfile((current) => ({ ...current, personal: { ...current.personal, disability: { ...current.personal.disability, disclosurePreference: event.target.value as DisclosurePreference } } }))}><option value="manual-review">Manuel inceleme</option><option value="disclose">Paylaş</option><option value="prefer-not-to-say">Yanıtlamamayı tercih et</option></select></Field>
                </div>
                <Field label="Düzenleme notları"><input className={INPUT_CLASS} value={profile.personal.disability.accommodationNotes ?? ""} onChange={(event) => updateProfile((current) => ({ ...current, personal: { ...current.personal, disability: { ...current.personal.disability, accommodationNotes: nullableText(event.target.value) } } }))} /></Field>
              </SectionCard>
            </div>
          ) : null}

          {activeSection === "work" ? (
            <div id="profile-panel-work" role="tabpanel" aria-labelledby="profile-tab-work" className="space-y-5">
              <SectionCard eyebrow="Ücret beklentisi" title="Para birimine göre beklentiler" subtitle="Dosya yalnızca değerleri tutar; dönem veya brüt/net anlamı eklenmez.">
                <div className="grid gap-4 md:grid-cols-3">
                  {(["usd", "eur", "try"] as const).map((currency) => <Field key={currency} label={currency.toUpperCase()}><input className={INPUT_CLASS} inputMode="decimal" value={textValue(profile.compensation.expectations[currency])} onChange={(event) => updateProfile((current) => ({ ...current, compensation: { ...current.compensation, expectations: { ...current.compensation.expectations, [currency]: nullableScalar(event.target.value) } } }))} /></Field>)}
                </div>
                <Field label="Ücret özeti" help="Serbest metin açıklaması."><textarea className={`${INPUT_CLASS} min-h-28 resize-y py-3`} value={profile.compensation.summary ?? ""} onChange={(event) => updateProfile((current) => ({ ...current, compensation: { ...current.compensation, summary: nullableText(event.target.value) } }))} /></Field>
              </SectionCard>

              <SectionCard eyebrow="Müsaitlik" title="Başlangıç bilgileri" subtitle="Hemen başlayabilme, ihbar süresi ve başlangıç tarihini birlikte yönet.">
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Hemen başlayabilir mi?"><NullableBooleanSelect ariaLabel="Hemen başlayabilme" value={profile.availability.canStartImmediately} onChange={(canStartImmediately) => updateProfile((current) => ({ ...current, availability: { ...current.availability, canStartImmediately } }))} /></Field>
                  <Field label="İhbar süresi"><input className={INPUT_CLASS} disabled={profile.availability.canStartImmediately === true} placeholder="Örn. 30 days" value={textValue(profile.availability.noticePeriod)} onChange={(event) => updateProfile((current) => ({ ...current, availability: { ...current.availability, noticePeriod: nullableScalar(event.target.value) } }))} /></Field>
                  <Field label="Başlangıç tarihi" help="Serbest metin veya tarih değeri."><input className={INPUT_CLASS} disabled={profile.availability.canStartImmediately === true} placeholder="YYYY-MM-DD" value={textValue(profile.availability.startDate)} onChange={(event) => updateProfile((current) => ({ ...current, availability: { ...current.availability, startDate: nullableScalar(event.target.value) } }))} /></Field>
                </div>
                {profile.availability.canStartImmediately === true && (profile.availability.noticePeriod != null || profile.availability.startDate != null) ? <p className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-xs leading-5 text-amber-100">Hemen başlayabilir seçili. Kayıtlı ihbar süresi ve başlangıç tarihi korunur ancak bu alanlar şu an devre dışıdır.</p> : null}
              </SectionCard>
            </div>
          ) : null}

          {activeSection === "links" ? (
            <div id="profile-panel-links" role="tabpanel" aria-labelledby="profile-tab-links" className="space-y-5">
              <SectionCard eyebrow="Profesyonel kimlik" title="Profil bağlantıları" subtitle="URL’leri https:// dahil tam adres olarak gir.">
                <div className="grid gap-5">
                  {([ ["linkedinUrl", "LinkedIn"], ["githubUrl", "GitHub"], ["portfolioUrl", "Portfolyo"] ] as const).map(([key, label]) => <Field key={key} label={label}><input className={INPUT_CLASS} placeholder="https://…" type="url" value={profile.identity[key] ?? ""} onChange={(event) => updateProfile((current) => ({ ...current, identity: { ...current.identity, [key]: nullableText(event.target.value) } }))} /></Field>)}
                </div>
              </SectionCard>

              <SectionCard eyebrow="Referanslar" title="Profesyonel referanslar" subtitle="Ad, ilişki ve tam LinkedIn bağlantısını düzenle.">
                <div className="grid gap-4">
                  {profile.references.map((reference, index) => (
                    <div key={index} className="rounded-2xl border border-line bg-black/20 p-4">
                      <div className="mb-4 flex items-center justify-between"><p className="text-sm font-semibold text-text">Referans {index + 1}</p><button aria-label={`${index + 1}. referansı kaldır`} className="flex size-11 items-center justify-center rounded-xl text-muted hover:bg-rose-400/10 hover:text-rose-200" type="button" onClick={() => updateProfile((current) => ({ ...current, references: current.references.filter((_, itemIndex) => itemIndex !== index) }))}><X className="size-4" /></button></div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Ad"><input className={INPUT_CLASS} value={reference.name} onChange={(event) => updateProfile((current) => ({ ...current, references: current.references.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item) }))} /></Field>
                        <Field label="İlişki"><input className={INPUT_CLASS} placeholder="Örn. Eski ekip lideri" value={reference.relationship ?? ""} onChange={(event) => updateProfile((current) => ({ ...current, references: current.references.map((item, itemIndex) => itemIndex === index ? { ...item, relationship: nullableText(event.target.value) } : item) }))} /></Field>
                        <div className="md:col-span-2"><Field label="LinkedIn URL"><input className={INPUT_CLASS} placeholder="https://www.linkedin.com/in/…" type="url" value={reference.linkedinUrl} onChange={(event) => updateProfile((current) => ({ ...current, references: current.references.map((item, itemIndex) => itemIndex === index ? { ...item, linkedinUrl: event.target.value } : item) }))} /></Field></div>
                      </div>
                    </div>
                  ))}
                  <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-dashed border-line text-sm font-semibold text-muted transition hover:border-blue-400/40 hover:text-blue-200" type="button" onClick={() => updateProfile((current) => ({ ...current, references: [...current.references, { name: "", linkedinUrl: "", relationship: null }] }))}><Plus className="size-4" aria-hidden="true" /> Referans ekle</button>
                </div>
              </SectionCard>
            </div>
          ) : null}

          {activeSection === "advanced" ? (
            <div id="profile-panel-advanced" role="tabpanel" aria-labelledby="profile-tab-advanced" className="space-y-5">
              <SectionCard eyebrow="Gelişmiş" title="Profil JSON’unun tamamı" subtitle="Formda görünmeyen alanları görüntülemek veya düzenlemek için kullan.">
                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">Buradaki değişiklikler önce doğrulanır ve forma uygulanır. Dosyaya yazılması için ayrıca ana “Değişiklikleri kaydet” düğmesine basmalısın.</div>
                <label className="space-y-2"><span className="text-sm font-medium text-text">profile.json</span><textarea className="min-h-[620px] w-full resize-y rounded-2xl border border-line bg-black/40 p-4 font-mono text-xs leading-6 text-slate-200 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20" spellCheck={false} value={rawJson} onChange={(event) => { setRawJson(event.target.value); setRawError(null); }} /></label>
                {rawError ? <div className="rounded-2xl border border-rose-400/25 bg-rose-400/10 p-4 text-sm leading-6 text-rose-100" role="alert">{rawError}</div> : null}
                <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-blue-400/30 bg-blue-400/10 px-5 text-sm font-semibold text-blue-100 transition hover:bg-blue-400/15" type="button" onClick={applyRawJson}><Braces className="size-4" aria-hidden="true" /> JSON’u forma uygula</button>
              </SectionCard>
            </div>
          ) : null}
        </div>
      </div>

      {(saveError || issues.length > 0) ? (
        <div className="rounded-3xl border border-rose-400/25 bg-rose-400/10 p-5 text-rose-100" role="alert">
          <div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" /><div><p className="font-semibold">Profil kaydedilemedi</p><p className="mt-1 text-sm leading-6">{saveError}</p>{issues.length > 0 ? <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul> : null}</div></div>
          <button className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-300/20 px-4 text-sm font-semibold" type="button" onClick={() => void loadProfile()}><RefreshCw className="size-4" aria-hidden="true" /> Dosyayı yeniden yükle</button>
        </div>
      ) : null}

      <div className="sticky bottom-4 z-10 rounded-3xl border border-line bg-ink/90 p-4 shadow-panel backdrop-blur-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0" aria-live="polite">
            {savedFlash ? <p className="flex items-center gap-2 text-sm font-semibold text-emerald-200"><CheckCircle2 className="size-4" aria-hidden="true" /> Profil kaydedildi</p> : isDirty ? <><p className="text-sm font-semibold text-amber-100">Kaydedilmemiş değişiklikler</p><p className="mt-1 truncate text-xs text-muted">{changedSections.join(" · ")}</p></> : <p className="flex items-center gap-2 text-sm text-muted"><CheckCircle2 className="size-4 text-emerald-300" aria-hidden="true" /> Tüm değişiklikler kaydedildi</p>}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-line bg-black/20 px-4 text-sm font-semibold text-text transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40" disabled={!isDirty || isSaving} type="button" onClick={resetChanges}><RotateCcw className="size-4" aria-hidden="true" /> Geri al</button>
            <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-500 px-5 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40" disabled={!isDirty || isSaving} type="button" onClick={() => void saveProfile()}>{isSaving ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}{isSaving ? "Kaydediliyor" : "Değişiklikleri kaydet"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
