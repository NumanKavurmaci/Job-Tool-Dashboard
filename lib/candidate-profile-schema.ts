export type RemotePreference = "remote" | "hybrid" | "onsite" | "flexible";
export type VisaRequirement = "required" | "not-required" | "unknown";
export type WorkAuthorizationStatus = "authorized" | "requires-sponsorship" | "unknown";
export type DisclosurePreference = "manual-review" | "disclose" | "prefer-not-to-say";

export type StringNumberOrNull = string | number | null;

export type CandidateProfileDocument = {
  experience: {
    years: number;
    overrides: Record<string, number>;
  };
  targeting: {
    preferredRoles: string[];
    preferredTechStack: string[];
    aspirationalTechStack: string[];
    preferredRoleOverlapSignals: string[];
    excludedRoles: string[];
    disallowedRoleKeywords: string[];
  };
  locations: {
    preferred: string[];
    excluded: string[];
    workplacePolicyBypass: string[];
    allowedHybrid: string[];
    remotePreference: RemotePreference;
    remoteOnly: boolean;
  };
  authorization: {
    visaRequirement: VisaRequirement;
    workAuthorizationStatus: WorkAuthorizationStatus;
    regional: {
      defaultRequiresSponsorship: boolean | null;
      turkeyRequiresSponsorship: boolean | null;
      europeRequiresSponsorship: boolean | null;
    };
  };
  personal: {
    languages: string[];
    gpa: number | null;
    demographics: {
      gender: string | null;
      pronouns: string | null;
      ethnicity: string | null;
      race: string | null;
      veteranStatus: string | null;
      sexualOrientation: string | null;
    };
    disability: {
      hasDisability: boolean;
      disabilities: Array<{
        type: string;
        percentage: number | null;
        notes: string | null;
      }>;
      requiresAccommodation: boolean | null;
      accommodationNotes: string | null;
      disclosurePreference: DisclosurePreference;
    };
  };
  identity: {
    linkedinUrl: string | null;
    githubUrl: string | null;
    portfolioUrl: string | null;
  };
  compensation: {
    expectations: {
      usd: StringNumberOrNull;
      eur: StringNumberOrNull;
      try: StringNumberOrNull;
    };
    summary: string | null;
  };
  availability: {
    noticePeriod: StringNumberOrNull;
    startDate: StringNumberOrNull;
    canStartImmediately: boolean | null;
  };
  references: Array<{
    name: string;
    linkedinUrl: string;
    relationship: string | null;
  }>;
};

export class CandidateProfileValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super("Candidate profile is invalid.");
    this.name = "CandidateProfileValidationError";
    this.issues = issues;
  }
}

const REMOTE_PREFERENCES = new Set<RemotePreference>(["remote", "hybrid", "onsite", "flexible"]);
const VISA_REQUIREMENTS = new Set<VisaRequirement>(["required", "not-required", "unknown"]);
const AUTHORIZATION_STATUSES = new Set<WorkAuthorizationStatus>(["authorized", "requires-sponsorship", "unknown"]);
const DISCLOSURE_PREFERENCES = new Set<DisclosurePreference>(["manual-review", "disclose", "prefer-not-to-say"]);
const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function inspectValue(value: unknown, path: string, issues: string[], depth = 0): void {
  if (depth > 12) {
    issues.push(`${path} is nested too deeply.`);
    return;
  }
  if (typeof value === "string" && value.length > 5_000) {
    issues.push(`${path} is too long.`);
    return;
  }
  if (Array.isArray(value)) {
    if (value.length > 250) issues.push(`${path} contains too many items.`);
    value.forEach((item, index) => inspectValue(item, `${path}[${index}]`, issues, depth + 1));
    return;
  }
  if (!isRecord(value)) return;
  const entries = Object.entries(value);
  if (entries.length > 250) issues.push(`${path} contains too many fields.`);
  for (const [key, child] of entries) {
    if (UNSAFE_KEYS.has(key)) issues.push(`${path}.${key} is not allowed.`);
    inspectValue(child, `${path}.${key}`, issues, depth + 1);
  }
}

function section(root: Record<string, unknown>, key: string, issues: string[]): Record<string, unknown> {
  const value = root[key];
  if (value === undefined) return {};
  if (!isRecord(value)) {
    issues.push(`${key} must be an object.`);
    return {};
  }
  return value;
}

function numberValue(
  value: unknown,
  fallback: number,
  path: string,
  issues: string[],
  range: { min: number; max?: number } = { min: 0 },
): number {
  if (value === undefined) return fallback;
  if (typeof value !== "number" || !Number.isFinite(value) || value < range.min || (range.max != null && value > range.max)) {
    issues.push(`${path} must be a number between ${range.min} and ${range.max ?? "infinity"}.`);
    return fallback;
  }
  return value;
}

function nullableNumber(
  value: unknown,
  path: string,
  issues: string[],
  range: { min: number; max?: number },
): number | null {
  if (value === undefined || value === null) return null;
  return numberValue(value, range.min, path, issues, range);
}

function booleanValue(value: unknown, fallback: boolean, path: string, issues: string[]): boolean {
  if (value === undefined) return fallback;
  if (typeof value !== "boolean") {
    issues.push(`${path} must be true or false.`);
    return fallback;
  }
  return value;
}

function nullableBoolean(value: unknown, path: string, issues: string[]): boolean | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "boolean") {
    issues.push(`${path} must be true, false, or null.`);
    return null;
  }
  return value;
}

function nullableString(value: unknown, path: string, issues: string[]): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    issues.push(`${path} must be text or null.`);
    return null;
  }
  return value;
}

function stringNumberOrNull(value: unknown, path: string, issues: string[]): StringNumberOrNull {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" && (typeof value !== "number" || !Number.isFinite(value))) {
    issues.push(`${path} must be text, a number, or null.`);
    return null;
  }
  return value;
}

function stringArray(value: unknown, path: string, issues: string[]): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    issues.push(`${path} must be a list of text values.`);
    return [];
  }
  return [...value];
}

function numberRecord(value: unknown, path: string, issues: string[]): Record<string, number> {
  if (value === undefined) return {};
  if (!isRecord(value)) {
    issues.push(`${path} must be an object of non-negative numbers.`);
    return {};
  }
  const result: Record<string, number> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item !== "number" || !Number.isFinite(item) || item < 0) {
      issues.push(`${path}.${key} must be a non-negative number.`);
      continue;
    }
    result[key] = item;
  }
  return result;
}

function enumValue<T extends string>(
  value: unknown,
  allowed: Set<T>,
  fallback: T,
  path: string,
  issues: string[],
): T {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !allowed.has(value as T)) {
    issues.push(`${path} has an unsupported value.`);
    return fallback;
  }
  return value as T;
}

function validateUrl(value: string | null, path: string, issues: string[], required = false): string | null {
  if (!value) {
    if (required) issues.push(`${path} is required.`);
    return value;
  }
  try {
    new URL(value);
    return value;
  } catch {
    issues.push(`${path} must be a complete URL.`);
    return value;
  }
}

export function normalizeCandidateProfile(input: unknown): CandidateProfileDocument {
  const issues: string[] = [];
  if (!isRecord(input)) {
    throw new CandidateProfileValidationError(["Profile must be a JSON object."]);
  }
  inspectValue(input, "profile", issues);

  const experience = section(input, "experience", issues);
  const targeting = section(input, "targeting", issues);
  const locations = section(input, "locations", issues);
  const authorization = section(input, "authorization", issues);
  const regional = section(authorization, "regional", issues);
  const personal = section(input, "personal", issues);
  const demographics = section(personal, "demographics", issues);
  const disability = section(personal, "disability", issues);
  const identity = section(input, "identity", issues);
  const compensation = section(input, "compensation", issues);
  const expectations = section(compensation, "expectations", issues);
  const availability = section(input, "availability", issues);

  const rawDisabilities = disability.disabilities;
  const disabilities = rawDisabilities === undefined
    ? []
    : Array.isArray(rawDisabilities)
      ? rawDisabilities.map((item, index) => {
          const record = isRecord(item) ? item : {};
          if (!isRecord(item)) issues.push(`personal.disability.disabilities[${index}] must be an object.`);
          const type = typeof record.type === "string" && record.type.trim()
            ? record.type
            : (issues.push(`personal.disability.disabilities[${index}].type is required.`), "");
          return {
            ...record,
            type,
            percentage: nullableNumber(record.percentage, `personal.disability.disabilities[${index}].percentage`, issues, { min: 0, max: 100 }),
            notes: nullableString(record.notes, `personal.disability.disabilities[${index}].notes`, issues),
          };
        })
      : (issues.push("personal.disability.disabilities must be a list."), []);

  const rawReferences = input.references;
  const references = rawReferences === undefined
    ? []
    : Array.isArray(rawReferences)
      ? rawReferences.map((item, index) => {
          const record = isRecord(item) ? item : {};
          if (!isRecord(item)) issues.push(`references[${index}] must be an object.`);
          const name = typeof record.name === "string" && record.name.trim()
            ? record.name
            : (issues.push(`references[${index}].name is required.`), "");
          const linkedinUrl = typeof record.linkedinUrl === "string" ? record.linkedinUrl : "";
          if (typeof record.linkedinUrl !== "string") issues.push(`references[${index}].linkedinUrl is required.`);
          validateUrl(linkedinUrl, `references[${index}].linkedinUrl`, issues, true);
          return {
            ...record,
            name,
            linkedinUrl,
            relationship: nullableString(record.relationship, `references[${index}].relationship`, issues),
          };
        })
      : (issues.push("references must be a list."), []);

  const profile: CandidateProfileDocument = {
    ...input,
    experience: {
      ...experience,
      years: numberValue(experience.years, 0, "experience.years", issues),
      overrides: numberRecord(experience.overrides, "experience.overrides", issues),
    },
    targeting: {
      ...targeting,
      preferredRoles: stringArray(targeting.preferredRoles, "targeting.preferredRoles", issues),
      preferredTechStack: stringArray(targeting.preferredTechStack, "targeting.preferredTechStack", issues),
      aspirationalTechStack: stringArray(targeting.aspirationalTechStack, "targeting.aspirationalTechStack", issues),
      preferredRoleOverlapSignals: stringArray(targeting.preferredRoleOverlapSignals, "targeting.preferredRoleOverlapSignals", issues),
      excludedRoles: stringArray(targeting.excludedRoles, "targeting.excludedRoles", issues),
      disallowedRoleKeywords: stringArray(targeting.disallowedRoleKeywords, "targeting.disallowedRoleKeywords", issues),
    },
    locations: {
      ...locations,
      preferred: stringArray(locations.preferred, "locations.preferred", issues),
      excluded: stringArray(locations.excluded, "locations.excluded", issues),
      workplacePolicyBypass: stringArray(locations.workplacePolicyBypass, "locations.workplacePolicyBypass", issues),
      allowedHybrid: stringArray(locations.allowedHybrid, "locations.allowedHybrid", issues),
      remotePreference: enumValue(locations.remotePreference, REMOTE_PREFERENCES, "flexible", "locations.remotePreference", issues),
      remoteOnly: booleanValue(locations.remoteOnly, false, "locations.remoteOnly", issues),
    },
    authorization: {
      ...authorization,
      visaRequirement: enumValue(authorization.visaRequirement, VISA_REQUIREMENTS, "unknown", "authorization.visaRequirement", issues),
      workAuthorizationStatus: enumValue(authorization.workAuthorizationStatus, AUTHORIZATION_STATUSES, "unknown", "authorization.workAuthorizationStatus", issues),
      regional: {
        ...regional,
        defaultRequiresSponsorship: nullableBoolean(regional.defaultRequiresSponsorship, "authorization.regional.defaultRequiresSponsorship", issues),
        turkeyRequiresSponsorship: nullableBoolean(regional.turkeyRequiresSponsorship, "authorization.regional.turkeyRequiresSponsorship", issues),
        europeRequiresSponsorship: nullableBoolean(regional.europeRequiresSponsorship, "authorization.regional.europeRequiresSponsorship", issues),
      },
    },
    personal: {
      ...personal,
      languages: stringArray(personal.languages, "personal.languages", issues),
      gpa: nullableNumber(personal.gpa, "personal.gpa", issues, { min: 0, max: 4 }),
      demographics: {
        ...demographics,
        gender: nullableString(demographics.gender, "personal.demographics.gender", issues),
        pronouns: nullableString(demographics.pronouns, "personal.demographics.pronouns", issues),
        ethnicity: nullableString(demographics.ethnicity, "personal.demographics.ethnicity", issues),
        race: nullableString(demographics.race, "personal.demographics.race", issues),
        veteranStatus: nullableString(demographics.veteranStatus, "personal.demographics.veteranStatus", issues),
        sexualOrientation: nullableString(demographics.sexualOrientation, "personal.demographics.sexualOrientation", issues),
      },
      disability: {
        ...disability,
        hasDisability: booleanValue(disability.hasDisability, disabilities.length > 0, "personal.disability.hasDisability", issues) || disabilities.length > 0,
        disabilities,
        requiresAccommodation: nullableBoolean(disability.requiresAccommodation, "personal.disability.requiresAccommodation", issues),
        accommodationNotes: nullableString(disability.accommodationNotes, "personal.disability.accommodationNotes", issues),
        disclosurePreference: enumValue(disability.disclosurePreference, DISCLOSURE_PREFERENCES, "manual-review", "personal.disability.disclosurePreference", issues),
      },
    },
    identity: {
      ...identity,
      linkedinUrl: validateUrl(nullableString(identity.linkedinUrl, "identity.linkedinUrl", issues), "identity.linkedinUrl", issues),
      githubUrl: validateUrl(nullableString(identity.githubUrl, "identity.githubUrl", issues), "identity.githubUrl", issues),
      portfolioUrl: validateUrl(nullableString(identity.portfolioUrl, "identity.portfolioUrl", issues), "identity.portfolioUrl", issues),
    },
    compensation: {
      ...compensation,
      expectations: {
        ...expectations,
        usd: stringNumberOrNull(expectations.usd, "compensation.expectations.usd", issues),
        eur: stringNumberOrNull(expectations.eur, "compensation.expectations.eur", issues),
        try: stringNumberOrNull(expectations.try, "compensation.expectations.try", issues),
      },
      summary: nullableString(compensation.summary, "compensation.summary", issues),
    },
    availability: {
      ...availability,
      noticePeriod: stringNumberOrNull(availability.noticePeriod, "availability.noticePeriod", issues),
      startDate: stringNumberOrNull(availability.startDate, "availability.startDate", issues),
      canStartImmediately: nullableBoolean(availability.canStartImmediately, "availability.canStartImmediately", issues),
    },
    references,
  };

  if (issues.length > 0) throw new CandidateProfileValidationError([...new Set(issues)]);
  return profile;
}

export function createEmptyCandidateProfile(): CandidateProfileDocument {
  return normalizeCandidateProfile({});
}
