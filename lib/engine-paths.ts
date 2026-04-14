import path from "node:path";

const DEFAULT_ENGINE_ROOT = path.resolve(process.cwd(), "..", "Job Tool");

export function getEngineRoot(): string {
  const configuredRoot = process.env.ENGINE_ROOT?.trim();

  if (!configuredRoot) {
    return DEFAULT_ENGINE_ROOT;
  }

  return path.isAbsolute(configuredRoot)
    ? configuredRoot
    : path.resolve(process.cwd(), configuredRoot);
}

export function getEngineDbPath(): string {
  return path.join(getEngineRoot(), "prisma", "dev.db");
}

export function getEngineLogPath(): string {
  return path.join(getEngineRoot(), "logs", "app.log");
}

export function getEngineArtifactsPath(): string {
  return path.join(getEngineRoot(), "artifacts");
}
