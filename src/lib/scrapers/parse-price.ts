/** Parses Brazilian currency strings like "R$ 1.234,56" or "1234.56" into a number. */
export function parseBrazilianPrice(raw: string): number | null {
  const cleaned = raw
    .replace(/[^\d,.-]/g, "")
    .trim();

  if (!cleaned) {
    return null;
  }

  let normalized = cleaned;

  if (cleaned.includes(",") && cleaned.includes(".")) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (cleaned.includes(",")) {
    normalized = cleaned.replace(",", ".");
  }

  const value = Number.parseFloat(normalized);

  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Math.round(value * 100) / 100;
}
