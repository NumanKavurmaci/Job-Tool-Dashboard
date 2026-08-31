import { beforeEach, describe, expect, it, vi } from "vitest";
import { CandidateProfileValidationError, createEmptyCandidateProfile } from "@/lib/candidate-profile-schema";

const storeMocks = vi.hoisted(() => {
  class CandidateProfileConflictError extends Error {
    readonly code = "PROFILE_CHANGED";
  }
  return {
    readCandidateProfileMock: vi.fn(),
    saveCandidateProfileMock: vi.fn(),
    CandidateProfileConflictError,
  };
});
vi.mock("@/lib/candidate-profile-store", () => ({
  readCandidateProfile: storeMocks.readCandidateProfileMock,
  saveCandidateProfile: storeMocks.saveCandidateProfileMock,
  CandidateProfileConflictError: storeMocks.CandidateProfileConflictError,
}));

import { GET, PUT } from "@/app/api/profile/route";

const snapshot = {
  profile: createEmptyCandidateProfile(),
  revision: "a".repeat(64),
  source: "profile" as const,
  profilePath: "C:\\engine\\user\\profile.json",
  sourcePath: "C:\\engine\\user\\profile.json",
  updatedAt: "2026-08-31T10:00:00.000Z",
};

function putRequest(body: string, origin = "http://127.0.0.1:3000") {
  return new Request("http://127.0.0.1:3000/api/profile", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      "Sec-Fetch-Site": origin === "http://127.0.0.1:3000" ? "same-origin" : "cross-site",
    },
    body,
  });
}

describe("profile API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeMocks.readCandidateProfileMock.mockResolvedValue(snapshot);
    storeMocks.saveCandidateProfileMock.mockResolvedValue(snapshot);
  });

  it("returns the current profile with no-store headers", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toEqual(snapshot);
  });

  it("guards profile mutations against cross-origin requests", async () => {
    const response = await PUT(putRequest(JSON.stringify({ profile: snapshot.profile, expectedRevision: snapshot.revision }), "https://attacker.example"));
    expect(response.status).toBe(403);
    expect(storeMocks.saveCandidateProfileMock).not.toHaveBeenCalled();
  });

  it("saves a valid profile with the expected revision", async () => {
    const response = await PUT(putRequest(JSON.stringify({ profile: snapshot.profile, expectedRevision: snapshot.revision })));
    expect(response.status).toBe(200);
    expect(storeMocks.saveCandidateProfileMock).toHaveBeenCalledWith(snapshot.profile, snapshot.revision);
  });

  it("returns clear validation and conflict responses", async () => {
    storeMocks.saveCandidateProfileMock.mockRejectedValueOnce(new CandidateProfileValidationError(["experience.years is invalid."]));
    const invalid = await PUT(putRequest(JSON.stringify({ profile: snapshot.profile, expectedRevision: snapshot.revision })));

    storeMocks.saveCandidateProfileMock.mockRejectedValueOnce(new storeMocks.CandidateProfileConflictError("changed"));
    const conflict = await PUT(putRequest(JSON.stringify({ profile: snapshot.profile, expectedRevision: snapshot.revision })));

    expect(invalid.status).toBe(422);
    await expect(invalid.json()).resolves.toMatchObject({ issues: ["experience.years is invalid."] });
    expect(conflict.status).toBe(409);
    await expect(conflict.json()).resolves.toMatchObject({ code: "PROFILE_CHANGED" });
  });

  it.each(["", "{invalid", "null"])("rejects an invalid JSON request body: %j", async (body) => {
    const response = await PUT(putRequest(body));
    expect(response.status).toBe(400);
    expect(storeMocks.saveCandidateProfileMock).not.toHaveBeenCalled();
  });

  it("rejects an oversized request body", async () => {
    const response = await PUT(putRequest(JSON.stringify({ padding: "x".repeat(257 * 1024) })));
    expect(response.status).toBe(413);
    expect(storeMocks.saveCandidateProfileMock).not.toHaveBeenCalled();
  });
});
