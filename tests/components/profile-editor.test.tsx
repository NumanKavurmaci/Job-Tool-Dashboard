import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { act, create, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeCandidateProfile } from "@/lib/candidate-profile-schema";
import { ProfileEditor, type ProfileSnapshot } from "@/src/components/dashboard/profile-editor";

const profile = normalizeCandidateProfile({
  experience: { years: 3, overrides: { TypeScript: 2 } },
  targeting: {
    preferredRoles: ["Backend Engineer", "Software Engineer"],
    preferredTechStack: ["TypeScript", "Node.js"],
    aspirationalTechStack: ["Python"],
    preferredRoleOverlapSignals: ["API"],
    excludedRoles: ["Staff"],
    disallowedRoleKeywords: ["SAP"],
  },
  locations: {
    preferred: ["Remote"],
    excluded: ["Onsite"],
    workplacePolicyBypass: ["Europe"],
    allowedHybrid: ["Ankara"],
    remotePreference: "remote",
    remoteOnly: true,
  },
  authorization: {
    visaRequirement: "unknown",
    workAuthorizationStatus: "authorized",
    regional: {
      defaultRequiresSponsorship: null,
      turkeyRequiresSponsorship: false,
      europeRequiresSponsorship: true,
    },
  },
  personal: {
    languages: ["English"],
    gpa: 2.4,
    demographics: {
      gender: "Male",
      pronouns: "he/him",
      ethnicity: "Turkish",
      race: "White",
      veteranStatus: "Not a veteran",
      sexualOrientation: "Prefer not to answer",
    },
    disability: {
      hasDisability: true,
      disabilities: [{ type: "visual", percentage: 46, notes: null }],
      requiresAccommodation: null,
      accommodationNotes: null,
      disclosurePreference: "manual-review",
    },
  },
  identity: {
    linkedinUrl: "https://www.linkedin.com/in/example",
    githubUrl: "https://github.com/example",
    portfolioUrl: "https://example.com",
  },
  compensation: {
    expectations: { usd: 2000, eur: "1800", try: null },
    summary: "Open to market rate",
  },
  availability: {
    noticePeriod: "0 days",
    startDate: null,
    canStartImmediately: true,
  },
  references: [{
    name: "Example Person",
    linkedinUrl: "https://www.linkedin.com/in/example-person",
    relationship: "Former manager",
  }],
});

const snapshot: ProfileSnapshot = {
  profile,
  revision: "a".repeat(64),
  source: "profile",
  profilePath: "C:\\engine\\user\\profile.json",
  sourcePath: "C:\\engine\\user\\profile.json",
  updatedAt: "2026-08-31T10:00:00.000Z",
};

function instanceText(instance: ReactTestInstance): string {
  return instance.children
    .map((child) => typeof child === "string" ? child : instanceText(child))
    .join("");
}

function buttonWithText(renderer: ReactTestRenderer, text: string): ReactTestInstance {
  const button = renderer.root.findAllByType("button").find((candidate) => instanceText(candidate).includes(text));
  if (!button) throw new Error(`Button not found: ${text}`);
  return button;
}

async function clickTab(renderer: ReactTestRenderer, section: string) {
  await act(async () => {
    renderer.root.findByProps({ id: `profile-tab-${section}` }).props.onClick();
  });
}

describe("ProfileEditor", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("renders an explicit loading state before the profile request completes", () => {
    const html = renderToStaticMarkup(<ProfileEditor />);
    expect(html).toContain("Profil yükleniyor");
    expect(html).toContain("Yerel profil dosyası okunuyor");
  });

  it("does not claim that sensitive values are automatically withheld", () => {
    const source = readFileSync(path.resolve(process.cwd(), "src/components/dashboard/profile-editor.tsx"), "utf8");
    expect(source).not.toContain("otomatik gönderilmez");
    expect(source).not.toContain("her başvurudan önce");
    expect(source).toContain("backend mevcut kurallarına göre kullanabilir");
  });

  it.each([
    ["targets", "Deneyim ve hedef roller"],
    ["locations", "Nerede ve nasıl çalışmak istiyorsun?"],
    ["authorization", "Vize ve çalışma izni"],
    ["personal", "Demografik bilgiler"],
    ["work", "Para birimine göre beklentiler"],
    ["links", "Profesyonel referanslar"],
    ["advanced", "Profil JSON’unun tamamı"],
  ] as const)("renders the %s profile section", (section, expectedText) => {
    const html = renderToStaticMarkup(<ProfileEditor initialSection={section} initialSnapshot={snapshot} />);
    expect(html).toContain(expectedText);
    expect(html).toContain("Aktif profile.json");
  });

  it("supports the main structured editing interactions and saves the draft", async () => {
    vi.useFakeTimers();
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ...snapshot, revision: "b".repeat(64) }),
    });
    vi.stubGlobal("fetch", fetchMock);
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(<ProfileEditor initialSnapshot={snapshot} />);
    });

    const experienceInput = renderer.root.findAllByType("input").find((input) => input.props.type === "number" && input.props.value === 3);
    expect(experienceInput).toBeDefined();
    await act(async () => experienceInput?.props.onChange({ target: { value: "4" } }));

    const roleInput = renderer.root.findByProps({ "aria-label": "Tercih edilen roller için yeni değer" });
    await act(async () => {
      roleInput.props.onChange({ target: { value: "Platform Engineer" } });
      roleInput.props.onKeyDown({ key: "Enter", preventDefault: vi.fn() });
    });
    await act(async () => renderer.root.findByProps({ "aria-label": "Software Engineer rolünü yukarı taşı" }).props.onClick());

    const overrideTechnology = renderer.root.findByProps({ "aria-label": "Teknoloji" });
    await act(async () => overrideTechnology.props.onChange({ target: { value: "Node.js" } }));
    const overrideYears = renderer.root.findAllByType("input").find((input) => String(input.props["aria-label"] ?? "").includes("deneyim yılı"));
    await act(async () => overrideYears?.props.onChange({ target: { value: "1.5" } }));
    await act(async () => buttonWithText(renderer, "Teknoloji deneyimi ekle").props.onClick());

    await clickTab(renderer, "locations");
    const flexibleRadio = renderer.root.findAllByProps({ name: "remotePreference" }).at(-1);
    await act(async () => flexibleRadio?.props.onChange());
    const remoteOnly = renderer.root.findAllByType("input").find((input) => input.props.type === "checkbox");
    await act(async () => remoteOnly?.props.onChange({ target: { checked: false } }));
    const locationInput = renderer.root.findByProps({ "aria-label": "Tercih edilen konumlar için yeni değer" });
    await act(async () => {
      locationInput.props.onChange({ target: { value: "Germany" } });
      locationInput.props.onKeyDown({ key: "Enter", preventDefault: vi.fn() });
    });

    await clickTab(renderer, "authorization");
    const authorizationSelects = renderer.root.findByProps({ id: "profile-panel-authorization" }).findAllByType("select");
    await act(async () => {
      authorizationSelects[0]?.props.onChange({ target: { value: "required" } });
      authorizationSelects[1]?.props.onChange({ target: { value: "requires-sponsorship" } });
      authorizationSelects[2]?.props.onChange({ target: { value: "unknown" } });
    });

    await clickTab(renderer, "personal");
    const personalPanel = renderer.root.findByProps({ id: "profile-panel-personal" });
    const gpa = personalPanel.findAllByType("input").find((input) => input.props.type === "number" && input.props.max === "4");
    await act(async () => gpa?.props.onChange({ target: { value: "3.1" } }));
    const gender = personalPanel.findAllByType("input").find((input) => input.props.value === "Male");
    await act(async () => gender?.props.onChange({ target: { value: "Prefer not to answer" } }));
    const disabilityToggle = personalPanel.findAllByType("input").find((input) => input.props.type === "checkbox");
    await act(async () => disabilityToggle?.props.onChange({ target: { checked: false } }));
    await act(async () => buttonWithText(renderer, "Engel kaydı ekle").props.onClick());
    const disclosure = personalPanel.findAllByType("select").at(-1);
    await act(async () => disclosure?.props.onChange({ target: { value: "prefer-not-to-say" } }));

    await clickTab(renderer, "work");
    const workPanel = renderer.root.findByProps({ id: "profile-panel-work" });
    const usd = workPanel.findAllByType("input").find((input) => input.props.value === "2000");
    await act(async () => usd?.props.onChange({ target: { value: "2500" } }));
    await act(async () => workPanel.findByType("textarea").props.onChange({ target: { value: "Updated summary" } }));
    await act(async () => workPanel.findByType("select").props.onChange({ target: { value: "false" } }));

    await clickTab(renderer, "links");
    const linksPanel = renderer.root.findByProps({ id: "profile-panel-links" });
    const portfolio = linksPanel.findAllByType("input").find((input) => input.props.value === "https://example.com");
    await act(async () => portfolio?.props.onChange({ target: { value: "https://portfolio.example.com" } }));
    await act(async () => buttonWithText(renderer, "Referans ekle").props.onClick());

    await act(async () => buttonWithText(renderer, "Değişiklikleri kaydet").props.onClick());
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/profile");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "PUT" });
    await act(async () => vi.runAllTimers());
    renderer.unmount();
  });

  it("validates raw JSON, applies valid JSON, resets changes, and reports save conflicts", async () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Profil başka bir işlem tarafından değiştirildi.", code: "PROFILE_CHANGED" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(<ProfileEditor initialSection="advanced" initialSnapshot={snapshot} />);
    });

    const raw = renderer.root.findByType("textarea");
    await act(async () => raw.props.onChange({ target: { value: "{invalid" } }));
    await act(async () => buttonWithText(renderer, "JSON’u forma uygula").props.onClick());
    expect(instanceText(renderer.root)).toContain("JSON at position 1");

    const updated = { ...profile, experience: { ...profile.experience, years: 5 } };
    await act(async () => renderer.root.findByType("textarea").props.onChange({ target: { value: JSON.stringify(updated) } }));
    await act(async () => buttonWithText(renderer, "JSON’u forma uygula").props.onClick());
    expect(instanceText(renderer.root)).toContain("Kaydedilmemiş değişiklikler");

    await act(async () => buttonWithText(renderer, "Değişiklikleri kaydet").props.onClick());
    expect(instanceText(renderer.root)).toContain("Profil kaydedilemedi");
    await act(async () => buttonWithText(renderer, "Geri al").props.onClick());
    expect(instanceText(renderer.root)).toContain("Tüm değişiklikler kaydedildi");
    renderer.unmount();
  });
});
