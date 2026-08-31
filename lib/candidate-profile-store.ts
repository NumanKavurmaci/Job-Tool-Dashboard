import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { getEngineRoot } from "@/lib/engine-paths";
import {
  CandidateProfileValidationError,
  createEmptyCandidateProfile,
  normalizeCandidateProfile,
  type CandidateProfileDocument,
} from "@/lib/candidate-profile-schema";

const MAX_PROFILE_BYTES = 256 * 1024;

export type CandidateProfileSnapshot = {
  profile: CandidateProfileDocument;
  revision: string;
  source: "profile" | "example" | "default";
  profilePath: string;
  sourcePath: string | null;
  updatedAt: string | null;
};

export class CandidateProfileConflictError extends Error {
  readonly code = "PROFILE_CHANGED";

  constructor() {
    super("The profile changed after this page loaded. Reload it before saving.");
    this.name = "CandidateProfileConflictError";
  }
}
export function getCandidateProfilePath(): string {
  return path.join(getEngineRoot(), "user", "profile.json");
}

export function getCandidateProfileExamplePath(): string {
  return path.join(getEngineRoot(), "user", "profile.example.json");
}

function revisionFor(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

async function readOptional(filePath: string): Promise<{ content: string; updatedAt: string } | null> {
  try {
    const [content, metadata] = await Promise.all([readFile(filePath, "utf8"), stat(filePath)]);
    return { content, updatedAt: metadata.mtime.toISOString() };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function readCandidateProfile(): Promise<CandidateProfileSnapshot> {
  const profilePath = getCandidateProfilePath();
  const examplePath = getCandidateProfileExamplePath();
  const active = await readOptional(profilePath);
  const example = active ? null : await readOptional(examplePath);
  const sourceFile = active ?? example;

  if (!sourceFile) {
    const profile = createEmptyCandidateProfile();
    const content = `${JSON.stringify(profile, null, 2)}\n`;
    return {
      profile,
      revision: revisionFor(content),
      source: "default",
      profilePath,
      sourcePath: null,
      updatedAt: null,
    };
  }

  if (Buffer.byteLength(sourceFile.content, "utf8") > MAX_PROFILE_BYTES) {
    throw new CandidateProfileValidationError(["Profile file is too large."]);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(sourceFile.content) as unknown;
  } catch {
    throw new CandidateProfileValidationError(["Profile file contains invalid JSON."]);
  }

  return {
    profile: normalizeCandidateProfile(parsed),
    revision: revisionFor(sourceFile.content),
    source: active ? "profile" : "example",
    profilePath,
    sourcePath: active ? profilePath : examplePath,
    updatedAt: sourceFile.updatedAt,
  };
}

export async function saveCandidateProfile(
  input: unknown,
  expectedRevision: string,
): Promise<CandidateProfileSnapshot> {
  const current = await readCandidateProfile();
  if (!expectedRevision || current.revision !== expectedRevision) {
    throw new CandidateProfileConflictError();
  }

  const profile = normalizeCandidateProfile(input);
  const content = `${JSON.stringify(profile, null, 2)}\n`;
  if (Buffer.byteLength(content, "utf8") > MAX_PROFILE_BYTES) {
    throw new CandidateProfileValidationError(["Profile file is too large."]);
  }

  const profilePath = getCandidateProfilePath();
  await mkdir(path.dirname(profilePath), { recursive: true });
  await writeFile(profilePath, content, { encoding: "utf8", mode: 0o600 });
  return readCandidateProfile();
}
