// Server side of the image CAPTCHA login case. The answer never leaves the
// server: the browser gets a PNG and a cookie with a random challenge ID.
// Answers live in this process's memory, so the case needs a single server
// process.

import { randomUUID } from "node:crypto";

import { Resvg } from "@resvg/resvg-js";
import { create } from "svg-captcha";

import { USERS } from "@/app/lib/users";

const COOKIE_NAME = "image_captcha_id";
const COOKIE_PATTERN = new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`);
const COOKIE_PATH = "/api/auth/image-captcha";
const TTL_SECONDS = 300;
const MAX_CHALLENGES = 1000;
const IMAGE_WIDTH = 300;

// Kept on globalThis so the image route and the verify route share one store
// even if the bundler gives each route its own copy of this module.
type Challenge = { answer: string; expiresAt: number };
const globalStore = globalThis as typeof globalThis & { __imageCaptchaChallenges?: Map<string, Challenge> };
const challenges = (globalStore.__imageCaptchaChallenges ??= new Map<string, Challenge>());

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

/**
 * Drops expired challenges, then the oldest ones while the store is full.
 *
 * @param now - The current time in ms.
 */
function prune(now: number): void {
  // A Map keeps insertion order and all challenges share one TTL, so the
  // oldest challenges come first.
  for (const [id, challenge] of challenges) {
    if (challenge.expiresAt > now && challenges.size < MAX_CHALLENGES) break;
    challenges.delete(id);
  }
}

/**
 * Deletes a challenge and checks the guess against it.
 *
 * @param id - The challenge ID from the cookie.
 * @param guess - The text the user typed.
 * @returns True only if the challenge exists, is not expired, and matches.
 */
function spendChallenge(id: string | undefined, guess: string): boolean {
  const challenge = id ? challenges.get(id) : undefined;
  if (!id || !challenge) return false;
  challenges.delete(id);
  return challenge.expiresAt > Date.now() && challenge.answer === normalize(guess);
}

/**
 * Makes a new CAPTCHA, stores its answer, and renders it as a PNG.
 *
 * @returns 200 PNG with a `Set-Cookie` that holds only the challenge ID.
 */
export function createImageCaptcha(): Response {
  const now = Date.now();
  prune(now);

  const captcha = create({ size: 6, noise: 3, ignoreChars: "0oO1iIl" });
  const id = randomUUID();
  challenges.set(id, {
    answer: normalize(captcha.text),
    expiresAt: now + TTL_SECONDS * 1000,
  });

  // svg-captcha draws each character as a path, so resvg needs no fonts.
  const png = new Resvg(captcha.data, {
    background: "#ffffff",
    fitTo: { mode: "width", value: IMAGE_WIDTH },
    font: { loadSystemFonts: false },
  })
    .render()
    .asPng();

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
      "Set-Cookie": `${COOKIE_NAME}=${id}; Path=${COOKIE_PATH}; Max-Age=${TTL_SECONDS}; HttpOnly; SameSite=Strict`,
    },
  });
}

/**
 * Checks the typed CAPTCHA text, then the credentials. Each challenge works
 * for one attempt only.
 *
 * @param req - JSON body with `username`, `password`, and `captcha`, plus the
 *   challenge cookie.
 * @returns 200 `{ ok, role }`, or an error status with `{ error }`.
 */
export async function verifyImageCaptchaLogin(req: Request): Promise<Response> {
  const body = await req.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const captcha = typeof body?.captcha === "string" ? body.captcha : "";

  if (!captcha.trim()) {
    return Response.json({ error: "missing_captcha" }, { status: 400 });
  }

  const id = req.headers.get("cookie")?.match(COOKIE_PATTERN)?.[1];
  if (!spendChallenge(id, captcha)) {
    return Response.json({ error: "captcha_failed" }, { status: 401 });
  }

  const user = USERS[username];
  if (!user || user.password !== password) {
    return Response.json({ error: "invalid_credentials" }, { status: 401 });
  }

  return Response.json({ ok: true, role: user.role });
}
