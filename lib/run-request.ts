import { existsSync, lstatSync, realpathSync } from "node:fs";
import { isIP } from "node:net";
import path from "node:path";
import { getEngineRoot } from "./engine-paths";
import {
  getRunScriptDefinition,
  isRunScriptType,
  type RunFormValues,
  type RunScriptType,
} from "./run-config";

const MAX_TEXT_LENGTH = 4096;
const MAX_URL_LENGTH = 2048;

type RunStartPayload = {
  type: RunScriptType;
  values: RunFormValues;
};

export class RunRequestValidationError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isPathInside(parentPath: string, candidatePath: string): boolean {
  const relative = path.relative(parentPath, candidatePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function isDomain(hostname: string, expectedDomain: string): boolean {
  const normalized = hostname.toLowerCase();
  return normalized === expectedDomain || normalized.endsWith(`.${expectedDomain}`);
}

function isPrivateIpv4(hostname: string): boolean {
  const octets = hostname.split(".").map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet))) {
    return false;
  }

  return (
    octets[0] === 10 ||
    octets[0] === 127 ||
    (octets[0] === 169 && octets[1] === 254) ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168)
  );
}

function isPrivateHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    normalized.endsWith(".internal")
  ) {
    return true;
  }

  const ipVersion = isIP(normalized);
  if (ipVersion === 4) {
    return isPrivateIpv4(normalized);
  }
  if (ipVersion === 6) {
    return (
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe80:") ||
      normalized.startsWith("::ffff:127.")
    );
  }

  return false;
}

function validateHttpsUrl(type: RunScriptType, key: string, value: string): void {
  if (value.length > MAX_URL_LENGTH) {
    throw new RunRequestValidationError(`${key} is too long.`);
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new RunRequestValidationError(`${key} must be a valid HTTPS URL.`);
  }

  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw new RunRequestValidationError(`${key} must be a credential-free HTTPS URL.`);
  }

  if (key === "linkedinUrl" && !isDomain(parsed.hostname, "linkedin.com")) {
    throw new RunRequestValidationError("LinkedIn URL must use linkedin.com.");
  }

  if (key !== "url") {
    return;
  }

  if (["external-apply", "score", "decide", "explore"].includes(type)) {
    if (isPrivateHostname(parsed.hostname)) {
      throw new RunRequestValidationError("Job and application URLs must not target a local or private address.");
    }
    return;
  }

  if (type === "apply-batch") {
    const supportedListing =
      isDomain(parsed.hostname, "linkedin.com") ||
      isDomain(parsed.hostname, "reactjobs.io") ||
      isDomain(parsed.hostname, "jobs.ashbyhq.com");
    if (!supportedListing) {
      throw new RunRequestValidationError(
        "apply-batch requires a LinkedIn, ReactJobs, or Ashby listing URL.",
      );
    }
    return;
  }

  if (!isDomain(parsed.hostname, "linkedin.com")) {
    throw new RunRequestValidationError(`${type} requires a linkedin.com URL.`);
  }
}

function validateSafeEnginePath(key: string, value: string): void {
  if (value.length > MAX_TEXT_LENGTH || value.includes("\0")) {
    throw new RunRequestValidationError(`${key} is invalid.`);
  }

  const configuredRoot = getEngineRoot();
  const engineRoot = existsSync(configuredRoot) ? realpathSync(configuredRoot) : path.resolve(configuredRoot);
  const resolvedPath = path.resolve(engineRoot, value);
  const extension = path.extname(resolvedPath).toLowerCase();
  const allowedExtensions: Record<string, string[]> = {
    resumePath: [".pdf", ".docx", ".md", ".txt"],
    questionsPath: [".json"],
    reportPath: [".json"],
  };
  const allowedRoot = key === "resumePath"
    ? path.resolve(engineRoot, "user")
    : key === "reportPath"
      ? path.resolve(engineRoot, "artifacts", "batch-runs")
      : engineRoot;

  if (!isPathInside(allowedRoot, resolvedPath)) {
    throw new RunRequestValidationError(`${key} must stay inside ${path.relative(engineRoot, allowedRoot) || "the engine root"}.`);
  }

  if (!allowedExtensions[key]?.includes(extension)) {
    throw new RunRequestValidationError(`${key} has an unsupported file extension.`);
  }

  if (!existsSync(resolvedPath)) {
    throw new RunRequestValidationError(`${key} does not exist.`);
  }

  const fileStat = lstatSync(resolvedPath);
  if (!fileStat.isFile() || fileStat.isSymbolicLink()) {
    throw new RunRequestValidationError(`${key} must reference a regular file, not a symlink.`);
  }

  const realPath = realpathSync(resolvedPath);
  const realAllowedRoot = existsSync(allowedRoot) ? realpathSync(allowedRoot) : allowedRoot;
  if (
    (existsSync(allowedRoot) && lstatSync(allowedRoot).isSymbolicLink()) ||
    !isPathInside(engineRoot, realAllowedRoot) ||
    !isPathInside(realAllowedRoot, realPath)
  ) {
    throw new RunRequestValidationError(`${key} resolves outside its allowed engine directory.`);
  }
}

export function parseRunStartPayload(input: unknown): RunStartPayload {
  if (!isRecord(input) || !isRunScriptType(input.type)) {
    throw new RunRequestValidationError("A supported run type is required.");
  }

  const type = input.type;
  const rawValues = input.values === undefined ? {} : input.values;
  if (!isRecord(rawValues)) {
    throw new RunRequestValidationError("Run values must be an object.");
  }

  const definition = getRunScriptDefinition(type);
  const fieldsByKey = new Map(definition.fields.map((field) => [field.key, field]));
  const values: RunFormValues = {};

  for (const [key, rawValue] of Object.entries(rawValues)) {
    const field = fieldsByKey.get(key);
    if (!field) {
      throw new RunRequestValidationError(`Unknown field for ${type}: ${key}.`);
    }

    if (rawValue === undefined || rawValue === null || rawValue === "") {
      continue;
    }

    if (field.type === "checkbox") {
      if (typeof rawValue !== "boolean") {
        throw new RunRequestValidationError(`${field.label} must be true or false.`);
      }
      values[key] = rawValue;
      continue;
    }

    if (field.type === "number") {
      if (
        typeof rawValue !== "number" ||
        !Number.isInteger(rawValue) ||
        (field.min !== undefined && rawValue < field.min) ||
        (field.max !== undefined && rawValue > field.max)
      ) {
        throw new RunRequestValidationError(
          `${field.label} must be an integer between ${field.min ?? 0} and ${field.max ?? Number.MAX_SAFE_INTEGER}.`,
        );
      }
      values[key] = rawValue;
      continue;
    }

    if (typeof rawValue !== "string" || rawValue.length > MAX_TEXT_LENGTH) {
      throw new RunRequestValidationError(`${field.label} must be a valid string.`);
    }

    const stringValue = rawValue.trim();
    if (field.type === "select" && !field.options?.some((option) => option.value === stringValue)) {
      throw new RunRequestValidationError(`${field.label} contains an unsupported option.`);
    }

    if (key === "url" || key === "linkedinUrl") {
      validateHttpsUrl(type, key, stringValue);
    }
    if (key === "resumePath" || key === "questionsPath" || key === "reportPath") {
      validateSafeEnginePath(key, stringValue);
    }

    values[key] = stringValue;
  }

  for (const field of definition.fields) {
    if (field.required && (values[field.key] === undefined || values[field.key] === "")) {
      throw new RunRequestValidationError(`${field.label} is required.`);
    }
  }

  return { type, values };
}
