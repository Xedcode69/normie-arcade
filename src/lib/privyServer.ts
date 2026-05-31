import { importSPKI, jwtVerify } from "jose";

let cachedKey: Promise<CryptoKey> | null = null;

function getInternalSecret() {
  return process.env.PARTYKIT_INTERNAL_SECRET ?? "dev-internal-secret";
}

export function assertPartyKitRequest(request: Request) {
  const received = request.headers.get("x-partykit-secret");
  if (!received || received !== getInternalSecret()) {
    throw new Error("Unauthorized PartyKit request");
  }
}

async function getVerificationKey() {
  const key = process.env.PRIVY_VERIFICATION_KEY?.replace(/\\n/g, "\n");

  if (!key) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("PRIVY_VERIFICATION_KEY is required in production.");
    }

    return null;
  }

  cachedKey ??= importSPKI(key, "ES256");
  return cachedKey;
}

function unsafeDecodeSub(token: string) {
  const [, payload] = token.split(".");
  if (!payload) return null;

  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const decoded = JSON.parse(Buffer.from(normalized, "base64").toString("utf8")) as { sub?: string };
  return decoded.sub ?? null;
}

export async function verifyPrivyToken(token: string) {
  const key = await getVerificationKey();

  if (!key) {
    const sub = unsafeDecodeSub(token);
    if (!sub) throw new Error("Invalid Privy token");
    return sub;
  }

  const verified = await jwtVerify(token, key);
  if (!verified.payload.sub) {
    throw new Error("Privy token missing subject");
  }

  return verified.payload.sub;
}
