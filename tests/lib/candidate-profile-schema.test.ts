import { describe, expect, it } from "vitest";
import {
  CandidateProfileValidationError,
  createEmptyCandidateProfile,
  normalizeCandidateProfile,
  normalizeProfileComparisonKey,
} from "@/lib/candidate-profile-schema";

function validationIssues(input: unknown): string[] {
  try {
    normalizeCandidateProfile(input);
    return [];
  } catch (error) {
    if (error instanceof CandidateProfileValidationError) return error.issues;
    throw error;
  }
}

describe("candidate profile schema", () => {
  it("fills the backend defaults for an empty profile", () => {
    const profile = createEmptyCandidateProfile();

    expect(profile.experience).toEqual({ years: 0, overrides: {} });
    expect(profile.locations.remotePreference).toBe("flexible");
    expect(profile.authorization.regional.defaultRequiresSponsorship).toBeNull();
    expect(profile.personal.disability.disclosurePreference).toBe("manual-review");
  });

  it("preserves unknown fields while normalizing known sections", () => {
    const profile = normalizeCandidateProfile({
      customTopLevel: { enabled: true },
      experience: { years: 3, overrides: { TypeScript: 2 }, customExperience: "keep" },
      targeting: { preferredRoles: ["Backend Engineer"], customTargeting: 42 },
    }) as unknown as Record<string, unknown>;

    expect(profile.customTopLevel).toEqual({ enabled: true });
    expect(profile.experience).toMatchObject({
      years: 3,
      overrides: { TypeScript: 2 },
      customExperience: "keep",
    });
    expect(profile.targeting).toMatchObject({
      preferredRoles: ["Backend Engineer"],
      customTargeting: 42,
    });
  });

  it("rejects invalid ranges, URLs, enums, and unsafe object keys", () => {
    const unsafe = JSON.parse('{"__proto__":{"polluted":true}}') as unknown;

    expect(() => normalizeCandidateProfile({ personal: { gpa: 8 } })).toThrow(CandidateProfileValidationError);
    expect(() => normalizeCandidateProfile({ locations: { remotePreference: "sometimes" } })).toThrow(CandidateProfileValidationError);
    expect(() => normalizeCandidateProfile({ identity: { linkedinUrl: "linkedin.com/example" } })).toThrow(CandidateProfileValidationError);
    expect(() => normalizeCandidateProfile(unsafe)).toThrow(CandidateProfileValidationError);
  });

  it("accepts the nullable and numeric values supported by the engine", () => {
    const profile = normalizeCandidateProfile({
      compensation: { expectations: { usd: 2000, eur: "1800", try: null } },
      availability: { noticePeriod: 0, startDate: null, canStartImmediately: true },
      personal: {
        disability: {
          hasDisability: true,
          disabilities: [{ type: "visual", percentage: 46, notes: null }],
          requiresAccommodation: null,
          accommodationNotes: null,
          disclosurePreference: "manual-review",
        },
      },
    });

    expect(profile.compensation.expectations).toEqual({ usd: 2000, eur: "1800", try: null });
    expect(profile.availability.noticePeriod).toBe(0);
    expect(profile.personal.disability.disabilities[0]?.percentage).toBe(46);
  });

  it("collapses case and Turkish diacritic aliases in list fields", () => {
    const profile = normalizeCandidateProfile({
      targeting: { preferredRoles: ["Backend Engineer", "backend engineer"] },
      locations: { allowedHybrid: ["Izmir", "İzmir", "Eskisehir", "Eskişehir"] },
    });

    expect(profile.targeting.preferredRoles).toEqual(["Backend Engineer"]);
    expect(profile.locations.allowedHybrid).toEqual(["Izmir", "Eskisehir"]);
    expect(normalizeProfileComparisonKey(" İSTANBUL ")).toBe("istanbul");
  });

  it("rejects conflicting locations and invalid override keys", () => {
    expect(validationIssues({
      locations: { preferred: ["İzmir"], excluded: ["Izmir"] },
    })).toContain("locations.preferred conflicts with locations.excluded: İzmir.");

    expect(validationIssues({
      experience: { overrides: { "": 1, TypeScript: 2, typescript: 3 } },
    })).toEqual(expect.arrayContaining([
      "experience.overrides contains an empty technology name.",
      "experience.overrides.typescript duplicates another technology.",
    ]));
  });

  it("requires web URLs and blocks negative compensation without inventing a period", () => {
    expect(validationIssues({ identity: { githubUrl: "ftp://example.com/profile" } })).toContain("identity.githubUrl must be a complete http(s) URL.");
    expect(validationIssues({ compensation: { expectations: { usd: -1 } } })).toContain("compensation.expectations.usd must not be negative.");
    expect(validationIssues({ compensation: { expectations: { usd: "-2000 yearly" } } })).toContain("compensation.expectations.usd must not be negative.");

    const profile = normalizeCandidateProfile({ compensation: { expectations: { usd: "2000 yearly", eur: "1800 monthly" } } });
    expect(profile.compensation.expectations).toMatchObject({ usd: "2000 yearly", eur: "1800 monthly" });
  });
});
