const NORMIES_API_BASE = "https://api.normies.art";
const HOLDER_TTL_MS = 60 * 60 * 1000;

export function normieImageUrl(id: number) {
  return `${NORMIES_API_BASE}/normie/${id}/image.png`;
}

export function isHolderVerificationFresh(verifiedAt?: Date | string | null) {
  if (!verifiedAt) return false;
  return Date.now() - new Date(verifiedAt).getTime() < HOLDER_TTL_MS;
}

function collectNormieIds(value: unknown, ids = new Set<number>()) {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 9999) {
    ids.add(value);
  }

  if (typeof value === "string" && /^\d+$/.test(value)) {
    const parsed = Number(value);
    if (parsed >= 0 && parsed <= 9999) ids.add(parsed);
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectNormieIds(item, ids));
  }

  if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectNormieIds(item, ids));
  }

  return [...ids].sort((a, b) => a - b);
}

export async function fetchHolderNormieIds(address: string) {
  const response = await fetch(`${NORMIES_API_BASE}/holders/${address}`, {
    cache: "no-store",
    headers: { accept: "application/json" }
  });

  if (!response.ok) {
    throw new Error(`Normies holder API returned ${response.status}`);
  }

  const data = (await response.json()) as unknown;
  return collectNormieIds(data);
}
