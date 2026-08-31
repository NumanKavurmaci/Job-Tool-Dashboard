import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CandidateProfileConflictError,
  getCandidateProfilePath,
  readCandidateProfile,
  saveCandidateProfile,
} from "@/lib/candidate-profile-store";

const ORIGINAL_ENGINE_ROOT = process.env.ENGINE_ROOT;
let engineRoot = "";

describe("candidate profile store", () => {
  beforeEach(async () => {
    engineRoot = await mkdtemp(path.join(os.tmpdir(), "job-tool-profile-"));
    process.env.ENGINE_ROOT = engineRoot;
    await mkdir(path.join(engineRoot, "user"), { recursive: true });
  });

  afterEach(async () => {
    if (ORIGINAL_ENGINE_ROOT === undefined) delete process.env.ENGINE_ROOT;
    else process.env.ENGINE_ROOT = ORIGINAL_ENGINE_ROOT;
    if (engineRoot) await rm(engineRoot, { recursive: true, force: true });
  });

  it("loads the active profile and reports its source", async () => {
    await writeFile(getCandidateProfilePath(), JSON.stringify({ experience: { years: 3 } }), "utf8");

    const snapshot = await readCandidateProfile();

    expect(snapshot.source).toBe("profile");
    expect(snapshot.profile.experience.years).toBe(3);
    expect(snapshot.revision).toHaveLength(64);
  });

  it("falls back to the example and creates profile.json on save", async () => {
    await writeFile(
      path.join(engineRoot, "user", "profile.example.json"),
      JSON.stringify({ targeting: { preferredRoles: ["Software Engineer"] } }),
      "utf8",
    );
    const fallback = await readCandidateProfile();

    const saved = await saveCandidateProfile(
      { ...fallback.profile, customField: { preserved: true } },
      fallback.revision,
    );
    const disk = JSON.parse(await readFile(getCandidateProfilePath(), "utf8")) as Record<string, unknown>;

    expect(fallback.source).toBe("example");
    expect(saved.source).toBe("profile");
    expect(disk.customField).toEqual({ preserved: true });
  });

  it("rejects a stale revision without overwriting the file", async () => {
    await writeFile(getCandidateProfilePath(), JSON.stringify({ experience: { years: 2 } }), "utf8");
    const current = await readCandidateProfile();
    await writeFile(getCandidateProfilePath(), JSON.stringify({ experience: { years: 4 } }), "utf8");

    await expect(saveCandidateProfile(current.profile, current.revision)).rejects.toBeInstanceOf(CandidateProfileConflictError);
    await expect(readCandidateProfile()).resolves.toMatchObject({ profile: { experience: { years: 4 } } });
  });
});
