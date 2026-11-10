/**
 * Admin fingerprint / Face ID / passkey sign-in — server-backed (cross-device).
 *
 * The WebAuthn ceremony is verified by the backend (py_webauthn), and credentials
 * are stored server-side against the admin account. So a passkey added on one
 * device works on the admin's other devices too: discoverable (resident)
 * credentials allow usernameless login, and platform passkeys the OS syncs
 * (same Google / Apple account on a laptop and a phone) appear on every synced
 * device with no re-registration.
 *
 * Flow:
 *   - register(): signed in with the password, ask the server for options, run the
 *     platform authenticator, send the result back for verification + storage.
 *   - authenticate(): usernameless — ask the server for options, run the
 *     authenticator, send the assertion back; the server verifies it and returns a
 *     fresh admin JWT. No email or password needed.
 */

import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
} from "@simplewebauthn/browser";
import { webauthnApi } from "./api";

export function isSupported(): boolean {
  return typeof window !== "undefined" && browserSupportsWebAuthn();
}

export async function isPlatformAvailable(): Promise<boolean> {
  if (!isSupported()) return false;
  try {
    return await platformAuthenticatorIsAvailable();
  } catch {
    return false;
  }
}

/** A readable default name for the device the passkey is being added on. */
export function deviceLabel(): string {
  if (typeof navigator === "undefined") return "This device";
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) return "Android phone";
  if (/Macintosh/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows PC";
  return "This device";
}

/** Register a new passkey for the signed-in admin (password session required). */
export async function register(label?: string): Promise<void> {
  if (!isSupported()) throw new Error("This browser does not support passkeys.");
  const optionsJSON = await webauthnApi.registerOptions();
  const regResp = await startRegistration({ optionsJSON });
  await webauthnApi.registerVerify(regResp, label || deviceLabel());
}

/** Usernameless fingerprint login → returns a fresh admin access token. */
export async function authenticate(): Promise<{ access_token: string }> {
  if (!isSupported()) throw new Error("This browser does not support passkeys.");
  const { challenge_id, options } = await webauthnApi.loginOptions();
  const authResp = await startAuthentication({ optionsJSON: options });
  return webauthnApi.loginVerify({ challenge_id, response: authResp });
}

/** List the admin's registered passkeys (password session required). */
export async function listCredentials() {
  return webauthnApi.listCredentials();
}

/** Remove one registered passkey (password session required). */
export async function removeCredential(id: string) {
  return webauthnApi.deleteCredential(id);
}
