/**
 * Frontend-only passkey (fingerprint / Face ID / platform biometric) sign-in for the
 * Upgrade Talents India admin panel.
 *
 * The backend contract is never altered (see api.ts). The admin API only speaks
 * email + password + JWT, so we cannot run a real server-side WebAuthn ceremony.
 * Instead this module uses the platform authenticator purely on the device:
 *
 *   1. After a successful password login we create a platform credential
 *      (userVerification "required" → fingerprint / Face ID) and wrap the freshly
 *      issued JWT with an AES-GCM key.
 *   2. When the WebAuthn PRF extension is available, the AES key is DERIVED from the
 *      authenticator's PRF secret, which is only released after a successful
 *      biometric check — so the stored token is cryptographically bound to the
 *      fingerprint and cannot be decrypted without it.
 *   3. When PRF is not available, we fall back to a "gate" model: the token is still
 *      encrypted, but decryption only runs after a successful biometric assertion.
 *      The binding is weaker (the key material lives on the device) but the
 *      fingerprint is still required to proceed — same UX as a phone unlock.
 *
 * The stored JWT may expire; if a fingerprint login yields an invalid token the
 * caller falls back to the password form, exactly like a mobile app re-prompting.
 */

const STORE_KEY = "uti_admin_passkey";

type PasskeyRecord = {
  v: 1;
  email: string;
  rpId: string;
  credentialId: string; // base64url
  prf: boolean;
  salt: string; // base64url (PRF eval input)
  iv: string; // base64url (AES-GCM nonce)
  data: string; // base64url (encrypted JWT)
  rawKey?: string; // base64url — fallback (gate) mode only
};

/* ───────── base64url helpers ───────── */
function bufToB64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlToBuf(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const enc = new TextEncoder();
const dec = new TextDecoder();

/* ───────── capability checks ───────── */
export function isSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential !== "undefined" &&
    !!navigator.credentials?.create &&
    !!navigator.credentials?.get &&
    !!crypto?.subtle
  );
}

export async function isPlatformAvailable(): Promise<boolean> {
  if (!isSupported()) return false;
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/* ───────── record access ───────── */
export function getRecord(): PasskeyRecord | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const r = JSON.parse(raw) as PasskeyRecord;
    return r?.v === 1 && r.credentialId ? r : null;
  } catch {
    return null;
  }
}

export function registeredEmail(): string | null {
  return getRecord()?.email ?? null;
}

export function hasPasskey(): boolean {
  return getRecord() !== null;
}

export function removePasskey(): void {
  try {
    localStorage.removeItem(STORE_KEY);
  } catch {}
}

/* ───────── crypto ───────── */
async function aesKeyFromRaw(raw: Uint8Array): Promise<CryptoKey> {
  // PRF output / fallback key material is 32 bytes → import directly as AES-GCM-256.
  const bytes =
    raw.byteLength === 32
      ? raw
      : new Uint8Array(await crypto.subtle.digest("SHA-256", raw as BufferSource));
  return crypto.subtle.importKey("raw", bytes as BufferSource, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encryptToken(key: CryptoKey, token: string): Promise<{ iv: string; data: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    enc.encode(token) as BufferSource
  );
  return { iv: bufToB64url(iv), data: bufToB64url(ct) };
}

async function decryptToken(key: CryptoKey, ivB64: string, dataB64: string): Promise<string> {
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64urlToBuf(ivB64) as BufferSource },
    key,
    b64urlToBuf(dataB64) as BufferSource
  );
  return dec.decode(pt);
}

/* ───────── register (set up fingerprint after password login) ───────── */
export async function register(email: string, token: string): Promise<void> {
  if (!isSupported()) throw new Error("This browser does not support passkeys.");

  const rpId = location.hostname;
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));

  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { id: rpId, name: "Upgrade Talents India Admin" },
      user: { id: userId, name: email, displayName: email },
      // ES256 + RS256 so every platform authenticator is covered.
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
      timeout: 60000,
      extensions: { prf: {} } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null;

  if (!cred) throw new Error("Fingerprint setup was cancelled.");

  const credentialId = bufToB64url(cred.rawId);

  // Obtain the PRF secret the same way we will at login time: one assertion with
  // prf.eval. This both confirms the fingerprint works and derives the wrap key.
  let prfBytes: Uint8Array | null = null;
  try {
    const assertion = (await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rpId,
        allowCredentials: [{ type: "public-key", id: b64urlToBuf(credentialId) as BufferSource }],
        userVerification: "required",
        timeout: 60000,
        extensions: { prf: { eval: { first: salt } } } as AuthenticationExtensionsClientInputs,
      },
    })) as PublicKeyCredential | null;

    const res = assertion?.getClientExtensionResults?.() as any;
    const first = res?.prf?.results?.first;
    if (first) prfBytes = new Uint8Array(first);
  } catch {
    // ignore — treated as "no PRF" below
  }

  let record: PasskeyRecord;
  if (prfBytes) {
    const key = await aesKeyFromRaw(prfBytes);
    const { iv, data } = await encryptToken(key, token);
    record = { v: 1, email, rpId, credentialId, prf: true, salt: bufToB64url(salt), iv, data };
  } else {
    // Fallback gate mode: random key kept on device, biometric still required to use it.
    const rawKey = crypto.getRandomValues(new Uint8Array(32));
    const key = await aesKeyFromRaw(rawKey);
    const { iv, data } = await encryptToken(key, token);
    record = {
      v: 1, email, rpId, credentialId, prf: false,
      salt: bufToB64url(salt), iv, data, rawKey: bufToB64url(rawKey),
    };
  }

  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(record));
  } catch {
    throw new Error("Could not save the passkey on this device.");
  }
}

/* ───────── authenticate (fingerprint login) ───────── */
export async function authenticate(): Promise<{ token: string; email: string }> {
  if (!isSupported()) throw new Error("This browser does not support passkeys.");
  const rec = getRecord();
  if (!rec) throw new Error("No fingerprint is set up on this device.");

  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rpId: rec.rpId,
      allowCredentials: [{ type: "public-key", id: b64urlToBuf(rec.credentialId) as BufferSource }],
      userVerification: "required",
      timeout: 60000,
      extensions: rec.prf
        ? ({ prf: { eval: { first: b64urlToBuf(rec.salt) } } } as AuthenticationExtensionsClientInputs)
        : undefined,
    },
  })) as PublicKeyCredential | null;

  if (!assertion) throw new Error("Fingerprint sign-in was cancelled.");

  let key: CryptoKey;
  if (rec.prf) {
    const res = assertion.getClientExtensionResults?.() as any;
    const first = res?.prf?.results?.first;
    if (!first) throw new Error("Fingerprint could not be verified. Use your password.");
    key = await aesKeyFromRaw(new Uint8Array(first));
  } else {
    if (!rec.rawKey) throw new Error("Fingerprint data is corrupted. Set it up again.");
    key = await aesKeyFromRaw(b64urlToBuf(rec.rawKey));
  }

  let token: string;
  try {
    token = await decryptToken(key, rec.iv, rec.data);
  } catch {
    throw new Error("Fingerprint could not unlock this session. Use your password.");
  }
  return { token, email: rec.email };
}
