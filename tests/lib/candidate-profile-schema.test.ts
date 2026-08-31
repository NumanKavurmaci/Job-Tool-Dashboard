import { describe, expect, it } from "vitest";
import {
  CandidateProfileValidationError,
  createEmptyCandidateProfile,
  normalizeCandidateProfile,
} from "@/lib/candidate-profile-schema";

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
});
