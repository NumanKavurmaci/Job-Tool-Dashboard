export function parseTimestamp(value: string | number | Date | null | undefined): number {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : Number.NaN;
  }

  if (typeof value !== "string") {
    return Number.NaN;
  }

  const normalized = value.trim();
  if (!normalized) {
    return Number.NaN;
  }

  if (/^-?\d+(?:\.\d+)?$/.test(normalized)) {
    const numericTimestamp = Number(normalized);
    return Number.isFinite(numericTimestamp) ? numericTimestamp : Number.NaN;
  }

  return Date.parse(normalized);
}
