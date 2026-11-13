// Server side of the 2FA case at `/`: after the password step the server keeps
// a short-lived "pending" entry keyed by a random token in an httpOnly cookie.
// The TOTP step reads the user from it, so the client never picks whose secret
// is checked and never sees any secret. Everything lives in this process's
// memory, so the case needs a single server process.

import { randomUUID } from "node:crypto";

export const PENDING_COOKIE = "twofa_pending";
const PENDING_PATTERN = new RegExp(`(?:^|;\\s*)${PENDING_COOKIE}=([^;]+)`);
const PENDING_TTL_MS = 5 * 60 * 1000;

// Kept on globalThis so every route shares one store even if the bundler
// gives each route its own copy of this module.
const globalStore = globalThis as typeof globalThis & {
  __twofaPending?: Map<string, { username: string; expires: number }>;
};
const pending = (globalStore.__twofaPending ??= new Map<string, { username: string; expires: number }>());

/**
 * Opens a pending (password-verified, TOTP not yet) entry for a user.
 *
 * @param username - The user whose password was just verified.
 * @returns The random token to put in the cookie.
 */
export function createPending(username: string): string {
  const now = Date.now();
  for (const [token, entry] of pending) if (entry.expires <= now) pending.delete(token);
  const token = randomUUID();
  pending.set(token, { username, expires: now + PENDING_TTL_MS });
  return token;
}

/**
 * Looks up the user behind a request's pending cookie.
 *
 * @param req - The incoming request.
 * @returns The username and the token, or null if missing or expired.
 */
export function getPending(req: Request): { username: string; token: string } | null {
  const match = PENDING_PATTERN.exec(req.headers.get("cookie") ?? "");
  if (!match) return null;
  const entry = pending.get(match[1]);
  if (!entry) return null;
  if (entry.expires <= Date.now()) {
    pending.delete(match[1]);
    return null;
  }
  return { username: entry.username, token: match[1] };
}

/**
 * Drops a pending entry (used once the TOTP step succeeds).
 *
 * @param token - The pending token.
 */
export function destroyPending(token: string): void {
  pending.delete(token);
}
