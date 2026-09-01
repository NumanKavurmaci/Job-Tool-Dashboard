import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { act, create, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeCandidateProfile, type CandidateProfileDocument } from "@/lib/candidate-profile-schema";
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
    expect(html).toContain("Loading profile");
    expect(html).toContain("Reading the local profile file");
  });

  it("does not claim that sensitive values are automatically withheld", () => {
    const source = readFileSync(path.resolve(process.cwd(), "src/components/dashboard/profile-editor.tsx"), "utf8");
    expect(source).not.toContain("automatically withheld");
    expect(source).not.toContain("before every application");
    expect(source).toContain("The backend may use saved values according to its existing rules");
  });

  it.each([
    ["targets", "Experience and target roles"],
    ["locations", "Where and how do you want to work?"],
    ["authorization", "Visa and work authorization"],
    ["personal", "Demographic details"],
    ["work", "Expectations by currency"],
    ["links", "Professional references"],
    ["advanced", "Complete profile JSON"],
  ] as const)("renders the %s profile section", (section, expectedText) => {
    const html = renderToStaticMarkup(<ProfileEditor initialSection={section} initialSnapshot={snapshot} />);
    expect(html).toContain(expectedText);
    expect(html).toContain("Active profile.json");
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

    const roleInput = renderer.root.findByProps({ "aria-label": "New value for Preferred roles" });
    await act(async () => {
      roleInput.props.onChange({ target: { value: "Platform Engineer" } });
      roleInput.props.onKeyDown({ key: "Enter", preventDefault: vi.fn() });
    });
    await act(async () => renderer.root.findByProps({ "aria-label": "Move Software Engineer up" }).props.onClick());

    const overrideTechnology = renderer.root.findByProps({ "aria-label": "Technology" });
    await act(async () => overrideTechnology.props.onChange({ target: { value: "Node.js" } }));
    const overrideYears = renderer.root.findAllByType("input").find((input) => String(input.props["aria-label"] ?? "").includes("years of experience"));
    await act(async () => overrideYears?.props.onChange({ target: { value: "1.5" } }));
    await act(async () => buttonWithText(renderer, "Add technology experience").props.onClick());

    await clickTab(renderer, "locations");
    const flexibleRadio = renderer.root.findAllByProps({ name: "remotePreference" }).at(-1);
    await act(async () => flexibleRadio?.props.onChange());
    const remoteOnly = renderer.root.findAllByType("input").find((input) => input.props.type === "checkbox");
    await act(async () => remoteOnly?.props.onChange({ target: { checked: false } }));
    const locationInput = renderer.root.findByProps({ "aria-label": "New value for Preferred locations" });
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
    await act(async () => buttonWithText(renderer, "Add disability entry").props.onClick());
    const addedDisabilityType = personalPanel.findByProps({ "data-profile-path": "personal.disability.disabilities[0].type" }).findByType("input");
    await act(async () => addedDisabilityType.props.onChange({ target: { value: "hearing" } }));
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
    await act(async () => buttonWithText(renderer, "Add reference").props.onClick());
    const addedReferenceName = linksPanel.findByProps({ "data-profile-path": "references[1].name" }).findByType("input");
    const addedReferenceUrl = linksPanel.findByProps({ "data-profile-path": "references[1].linkedinUrl" }).findByType("input");
    await act(async () => {
      addedReferenceName.props.onChange({ target: { value: "New Reference" } });
      addedReferenceUrl.props.onChange({ target: { value: "https://www.linkedin.com/in/new-reference" } });
    });

    await act(async () => buttonWithText(renderer, "Save changes").props.onClick());
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/profile");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "PUT" });
    await act(async () => { vi.runAllTimers(); });
    renderer.unmount();
  });

  it("shows field-level URL validation and does not send an invalid profile", async () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(<ProfileEditor initialSection="links" initialSnapshot={snapshot} />);
    });

    const github = renderer.root.findByProps({ "aria-label": "GitHub URL" });
    await act(async () => github.props.onChange({ target: { value: "github.com/example" } }));
    await act(async () => buttonWithText(renderer, "Save changes").props.onClick());

    expect(fetchMock).not.toHaveBeenCalled();
    expect(instanceText(renderer.root)).toContain("Enter a complete web address beginning with https://.");
    expect(instanceText(renderer.root)).toContain("Please correct the highlighted fields.");
    renderer.unmount();
  });

  it("presents common schema failures as concise English field guidance", async () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const invalidProfile = JSON.parse(JSON.stringify(profile)) as CandidateProfileDocument;
    invalidProfile.experience = { years: -1, overrides: { "": 1, TypeScript: -1, typescript: 2 } };
    invalidProfile.targeting.preferredRoles = [""];
    invalidProfile.locations.preferred = ["İzmir"];
    invalidProfile.locations.excluded = ["Izmir"];
    invalidProfile.identity.githubUrl = "github.com/example";
    invalidProfile.compensation.expectations.usd = -1;
    invalidProfile.references = [{ name: "", linkedinUrl: "invalid", relationship: null }];
    const invalidSnapshot = { ...snapshot, profile: invalidProfile };
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(<ProfileEditor initialSnapshot={invalidSnapshot} />);
    });

    await act(async () => renderer.root.findByProps({ "aria-label": "Total years of experience" }).props.onChange({ target: { value: "-2" } }));
    await act(async () => buttonWithText(renderer, "Save changes").props.onClick());
    const text = instanceText(renderer.root);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(text).toContain("Enter a value within the allowed range.");
    expect(text).toContain("Technology name cannot be blank.");
    expect(text).toContain("Enter zero or a greater value.");
    expect(text).toContain("This technology already exists under another spelling.");
    expect(text).toContain("A location cannot be both preferred and excluded.");
    expect(text).toContain("Blank values cannot be added.");
    expect(text).toContain("Negative values are not allowed.");
    expect(text).toContain("This field is required.");
    renderer.unmount();
  });

  it("renders the revised field guidance and live contradiction warnings", () => {
    const targets = renderToStaticMarkup(<ProfileEditor initialSection="targets" initialSnapshot={snapshot} />);
    expect(targets).toContain("Advanced matching signals");
    expect(targets).toContain("years");

    const locations = renderToStaticMarkup(<ProfileEditor initialSection="locations" initialSnapshot={snapshot} />);
    expect(locations).toContain("1 unique city");

    const authorization = renderToStaticMarkup(<ProfileEditor initialSection="authorization" initialSnapshot={snapshot} />);
    expect(authorization).toContain("at least one region requires sponsorship");

    const links = renderToStaticMarkup(<ProfileEditor initialSection="links" initialSnapshot={snapshot} />);
    expect(links).toContain(" Open</a>");
  });

  it("validates raw JSON, applies valid JSON, resets changes, and reports save conflicts", async () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "The profile was changed by another process.", code: "PROFILE_CHANGED" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(<ProfileEditor initialSection="advanced" initialSnapshot={snapshot} />);
    });

    const raw = renderer.root.findByType("textarea");
    await act(async () => raw.props.onChange({ target: { value: "{invalid" } }));
    await act(async () => buttonWithText(renderer, "Apply JSON to form").props.onClick());
    expect(instanceText(renderer.root)).toContain("JSON at position 1");

    const updated = { ...profile, experience: { ...profile.experience, years: 5 } };
    await act(async () => renderer.root.findByType("textarea").props.onChange({ target: { value: JSON.stringify(updated) } }));
    await act(async () => buttonWithText(renderer, "Apply JSON to form").props.onClick());
    expect(instanceText(renderer.root)).toContain("Unsaved changes");

    await act(async () => buttonWithText(renderer, "Save changes").props.onClick());
    expect(instanceText(renderer.root)).toContain("Profile could not be saved");
    await act(async () => buttonWithText(renderer, "Undo").props.onClick());
    expect(instanceText(renderer.root)).toContain("All changes saved");
    renderer.unmount();
  });
});
