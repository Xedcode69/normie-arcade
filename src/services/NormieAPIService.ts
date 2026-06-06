import { RateLimiter } from "@/lib/rateLimiter";
import { EXPRESSIONS, type Normie, type NormieMetadata, type NormieTraits } from "@/types/normie";

const BASE_URL = "https://api.normies.art";
const MAX_ID = 9999;
const limiter = new RateLimiter(56, 60_000);

const traitCache = new Map<number, NormieTraits>();
const metadataCache = new Map<number, NormieMetadata>();
const normieCache = new Map<number, Normie>();
const pixelCache = new Map<number, string>();
const burnedTokenCache = new Map<string, number[]>();
const inflight = new Map<string, Promise<unknown>>();

type RawTraitsResponse =
  | NormieTraits
  | {
      attributes?: Array<{ trait_type?: string; value?: string | number | boolean }>;
      raw?: string;
    };

function randomId() {
  return Math.floor(Math.random() * (MAX_ID + 1));
}

async function fetchWithRetry<T>(url: string, attempts = 3): Promise<T> {
  let lastError: unknown;

  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await limiter.enqueue(() => fetch(url));
      if (!response.ok) throw new Error(`Normies API ${response.status}: ${url}`);
      return (await response.json()) as T;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 350 * (index + 1)));
    }
  }

  throw lastError;
}

async function fetchTextWithRetry(url: string, attempts = 3): Promise<string> {
  let lastError: unknown;

  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await limiter.enqueue(() => fetch(url));
      if (!response.ok) throw new Error(`Normies API ${response.status}: ${url}`);
      return response.text();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 350 * (index + 1)));
    }
  }

  throw lastError;
}

function dedupe<T>(key: string, run: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const promise = run().finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}

function fallbackTraits(id: number): NormieTraits {
  const types = ["Human", "Cat", "Alien", "Agent"] as const;
  return {
    Type: types[id % types.length],
    Gender: ["Male", "Female", "Non-Binary"][id % 3],
    Age: ["Young", "Middle-Aged", "Old"][id % 3],
    "Hair Style": "Fallback Fade",
    "Facial Feature": "Pixel Smile",
    Eyes: "Bright",
    Expression: EXPRESSIONS[id % EXPRESSIONS.length],
    Accessory: "Neon Pass"
  };
}

function normalizeTraits(response: RawTraitsResponse, id: number): NormieTraits {
  if ("attributes" in response && Array.isArray(response.attributes)) {
    return response.attributes.reduce<NormieTraits>((traits, attribute) => {
      if (attribute.trait_type && attribute.value !== undefined) {
        traits[attribute.trait_type] = attribute.value;
      }
      return traits;
    }, {});
  }

  return Object.keys(response).length ? (response as NormieTraits) : fallbackTraits(id);
}

function extractIds(value: unknown): number[] {
  if (typeof value === "number" && Number.isFinite(value)) return [value];
  if (typeof value === "string" && Number.isFinite(Number(value))) return [Number(value)];
  if (Array.isArray(value)) return value.flatMap(extractIds);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return extractIds(record.tokenId ?? record.id ?? record.normieId ?? record.token_id ?? record.tokens ?? record.burnedTokens ?? record.items ?? record.data);
  }

  return [];
}

export const NormieAPIService = {
  imageUrl(id: number) {
    return `${BASE_URL}/normie/${id}/image.png`;
  },

  svgUrl(id: number) {
    return `${BASE_URL}/normie/${id}/image.svg`;
  },

  burnedImageUrl(id: number) {
    return `${BASE_URL}/history/burned/${id}/image.png`;
  },

  async fetchNormieTraits(id: number): Promise<NormieTraits> {
    if (traitCache.has(id)) return traitCache.get(id)!;

    return dedupe(`traits:${id}`, async () => {
      try {
        const response = await fetchWithRetry<RawTraitsResponse>(`${BASE_URL}/normie/${id}/traits`);
        const traits = normalizeTraits(response, id);
        traitCache.set(id, traits);
        return traits;
      } catch {
        const traits = fallbackTraits(id);
        traitCache.set(id, traits);
        return traits;
      }
    });
  },

  fetchNormieImage(id: number) {
    return this.imageUrl(id);
  },

  async fetchNormiePixels(id: number): Promise<string> {
    if (pixelCache.has(id)) return pixelCache.get(id)!;

    return dedupe(`pixels:${id}`, async () => {
      const pixels = await fetchTextWithRetry(`${BASE_URL}/normie/${id}/pixels`);
      pixelCache.set(id, pixels);
      return pixels;
    });
  },

  async fetchBurnedNormieIds(limit = 80): Promise<number[]> {
    const cacheKey = `burned:${limit}`;
    if (burnedTokenCache.has(cacheKey)) return burnedTokenCache.get(cacheKey)!;

    return dedupe(cacheKey, async () => {
      try {
        const response = await fetchWithRetry<unknown>(`${BASE_URL}/history/burned-tokens?limit=${limit}`);
        const ids = [...new Set(extractIds(response).filter((id) => id >= 0 && id <= MAX_ID))];
        burnedTokenCache.set(cacheKey, ids);
        return ids;
      } catch {
        burnedTokenCache.set(cacheKey, []);
        return [];
      }
    });
  },

  async fetchNormieMetadata(id: number): Promise<NormieMetadata> {
    if (metadataCache.has(id)) return metadataCache.get(id)!;

    return dedupe(`metadata:${id}`, async () => {
      try {
        const metadata = await fetchWithRetry<NormieMetadata>(`${BASE_URL}/normie/${id}/metadata`);
        metadataCache.set(id, metadata);
        return metadata;
      } catch {
        const metadata = { name: `Normie #${id}`, attributes: [] };
        metadataCache.set(id, metadata);
        return metadata;
      }
    });
  },

  async getNormie(id: number): Promise<Normie> {
    if (normieCache.has(id)) return normieCache.get(id)!;

    return dedupe(`normie:${id}`, async () => {
      const [traits, metadata] = await Promise.all([this.fetchNormieTraits(id), this.fetchNormieMetadata(id)]);
      const normie = {
        id,
        traits,
        metadata,
        image: this.imageUrl(id),
        svg: this.svgUrl(id)
      };
      normieCache.set(id, normie);
      return normie;
    });
  },

  async getRandomNormie(): Promise<Normie> {
    return this.getNormie(randomId());
  },

  async getRandomNormies(count: number): Promise<Normie[]> {
    const ids = new Set<number>();
    while (ids.size < count) ids.add(randomId());
    return Promise.all([...ids].map((id) => this.getNormie(id)));
  },

  async preloadNormies(count = 12) {
    return this.getRandomNormies(count);
  }
};
