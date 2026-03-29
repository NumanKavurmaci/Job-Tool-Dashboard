import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { getEngineArtifactsPath } from "./engine-paths";

export type ArtifactSummary = {
  name: string;
  category: string;
  fullPath: string;
  updatedAt: string;
  size: number;
};

export function readRecentArtifacts(limit = 12): ArtifactSummary[] {
  const base = getEngineArtifactsPath();
  const categories = ["batch-runs", "screenshots"];
  const rows: ArtifactSummary[] = [];

  for (const category of categories) {
    const dir = path.join(base, category);
    try {
      const files = readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = statSync(fullPath);
        if (!stat.isFile()) continue;
        rows.push({
          name: file,
          category,
          fullPath,
          updatedAt: stat.mtime.toISOString(),
          size: stat.size,
        });
      }
    } catch {
      continue;
    }
  }

  return rows
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .slice(0, limit);
}

export function readArtifactPreview(summary: ArtifactSummary): string | null {
  if (!summary.name.endsWith(".json")) return null;
  try {
    const content = readFileSync(summary.fullPath, "utf8");
    return content.slice(0, 600);
  } catch {
    return null;
  }
}
