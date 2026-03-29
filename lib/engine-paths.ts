import path from "node:path";

const DEFAULT_ENGINE_ROOT = "C:\\Users\\numan\\OneDrive\\Desktop\\Job Tool";

export function getEngineRoot(): string {
  return process.env.ENGINE_ROOT?.trim() || DEFAULT_ENGINE_ROOT;
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
