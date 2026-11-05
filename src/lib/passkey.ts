/**
 * Frontend-only passkey (fingerprint / Face ID / platform biometric) sign-in for the
 * Upgrade Talents India admin panel — built on @simplewebauthn/browser.
 *
 * The backend contract is never altered (see api.ts). The admin API only speaks
 * email + password + JWT, so there is no server-side WebAuthn ceremony. Instead the
 * platform authenticator is used purely on the device as an unlock gate, exactly
 * like a phone unlocking a saved session:
 *
 *   1. After a successful password login we register a platform credential
 *      (userVerification "required" → fingerprint / Face ID) and store the freshly
 *      issued JWT AES-GCM-encrypted in this browser.
 *   2. On the next visit, a successful biometric assertion for that credential is
 *      required before the stored token is decrypted and used. The token is
 *      encrypted at rest and never leaves the device.
 *
 * The stored JWT may expire; if a fingerprint login yields an invalid token the
 * caller falls back to the password form, like a mobile app re-prompting.
 */

import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
} from "@simplewebauthn/browser";

const STORE_KEY = "uti_admin_passkey";

type PasskeyRecord = {
  v: 2;
  email: string;
  rpId: string;
  credentialId: string; // base64url (as returned by the browser)
  key: string; // base64url — AES-GCM wrap key (device-local gate)
  iv: string; // base64url
  data: string; // base64url (encrypted JWT)
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
function randB64url(n: number): string {
  return bufToB64url(crypto.getRandomValues(new Uint8Array(n)));
}
const enc = new TextEncoder();
const dec = new TextDecoder();

/* ───────── capability checks ───────── */
export function isSupported(): boolean {
  return typeof window !== "undefined" && browserSupportsWebAuthn() && !!crypto?.subtle;
}

export async function isPlatformAvailable(): Promise<boolean> {
  if (!isSupported()) return false;
  try {
    return await platformAuthenticatorIsAvailable();
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
    return r?.v === 2 && r.credentialId ? r : null;
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

/* ───────── crypto (device-local token wrap) ───────── */
async function importKey(rawB64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", b64urlToBuf(rawB64) as BufferSource, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}
async function encryptToken(keyB64: string, token: string): Promise<{ iv: string; data: string }> {
  const key = await importKey(keyB64);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    enc.encode(token) as BufferSource
  );
  return { iv: bufToB64url(iv), data: bufToB64url(ct) };
}
async function decryptToken(keyB64: string, ivB64: string, dataB64: string): Promise<string> {
  const key = await importKey(keyB64);
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64urlToBuf(ivB64) as BufferSource },
    key,
    b64urlToBuf(dataB64) as BufferSource
  );
  return dec.decode(pt);
}

/* ───────── register (set up fingerprint after a password login) ───────── */
export async function register(email: string, token: string): Promise<void> {
  if (!isSupported()) throw new Error("This browser does not support passkeys.");
  const rpId = location.hostname;

  const reg = await startRegistration({
    optionsJSON: {
      rp: { id: rpId, name: "Upgrade Talents India Admin" },
      user: { id: randB64url(16), name: email, displayName: email },
      challenge: randB64url(32),
      pubKeyCredParams: [
        { type: "public-key", alg: -7 }, // ES256
        { type: "public-key", alg: -257 }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
      timeout: 60000,
      attestation: "none",
    },
  });

  const keyB64 = randB64url(32);
  const { iv, data } = await encryptToken(keyB64, token);
  const record: PasskeyRecord = {
    v: 2,
    email,
    rpId,
    credentialId: reg.id,
    key: keyB64,
    iv,
    data,
  };
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

  // A successful assertion = the biometric was verified by the platform authenticator.
  await startAuthentication({
    optionsJSON: {
      challenge: randB64url(32),
      rpId: rec.rpId,
      allowCredentials: [{ id: rec.credentialId, type: "public-key" }],
      userVerification: "required",
      timeout: 60000,
    },
  });

  let token: string;
  try {
    token = await decryptToken(rec.key, rec.iv, rec.data);
  } catch {
    throw new Error("Fingerprint could not unlock this session. Use your password.");
  }
  return { token, email: rec.email };
}
