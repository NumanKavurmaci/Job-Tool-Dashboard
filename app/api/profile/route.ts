import {
  CandidateProfileConflictError,
  readCandidateProfile,
  saveCandidateProfile,
} from "@/lib/candidate-profile-store";
import { CandidateProfileValidationError } from "@/lib/candidate-profile-schema";
import { guardMutationRequest, jsonNoStore } from "@/lib/request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_PROFILE_REQUEST_BYTES = 256 * 1024;

export async function GET() {
  try {
    return jsonNoStore(await readCandidateProfile());
  } catch (error) {
    if (error instanceof CandidateProfileValidationError) {
      return jsonNoStore({ error: error.message, issues: error.issues }, { status: 422 });
    }
    return jsonNoStore(
      { error: error instanceof Error ? error.message : "Failed to read the candidate profile." },
      { status: 500 },
    );
  }
}
export async function PUT(request: Request) {
  const guardResponse = guardMutationRequest(request);
  if (guardResponse) return guardResponse;

  try {
    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_PROFILE_REQUEST_BYTES) {
      return jsonNoStore({ error: "Profile request is too large." }, { status: 413 });
    }

    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_PROFILE_REQUEST_BYTES) {
      return jsonNoStore({ error: "Profile request is too large." }, { status: 413 });
    }

    const payload = JSON.parse(rawBody) as unknown;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return jsonNoStore({ error: "Profile request must be a JSON object." }, { status: 400 });
    }

    const { profile, expectedRevision } = payload as Record<string, unknown>;
    if (typeof expectedRevision !== "string" || !expectedRevision) {
      return jsonNoStore({ error: "A profile revision is required." }, { status: 400 });
    }

    return jsonNoStore(await saveCandidateProfile(profile, expectedRevision));
  } catch (error) {
    if (error instanceof SyntaxError) {
      return jsonNoStore({ error: "Profile request contains invalid JSON." }, { status: 400 });
    }
    if (error instanceof CandidateProfileValidationError) {
      return jsonNoStore({ error: error.message, issues: error.issues }, { status: 422 });
    }
    if (error instanceof CandidateProfileConflictError) {
      return jsonNoStore({ error: error.message, code: error.code }, { status: 409 });
    }
    return jsonNoStore(
      { error: error instanceof Error ? error.message : "Failed to save the candidate profile." },
      { status: 500 },
    );
  }
}
