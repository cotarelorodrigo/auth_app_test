// Server-side TOTP (RFC 6238: HMAC-SHA1, 30 s step, 6 digits), so the secrets
// never have to reach the browser.

import { createHmac, timingSafeEqual } from "node:crypto";

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SECONDS = 30;

function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/=+$/, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of clean) {
    value = (value << 5) | BASE32.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((value >> bits) & 0xff);
    }
  }
  return Buffer.from(out);
}

/**
 * Computes the TOTP code for a secret.
 *
 * @param secret - Base32-encoded shared secret.
 * @param stepOffset - 30 s steps relative to `now` (-1 = previous code).
 * @param now - Time in ms since the epoch.
 * @returns The 6-digit code, zero-padded.
 */
export function generateTotp(secret: string, stepOffset = 0, now = Date.now()): string {
  const counter = Math.floor(now / 1000 / STEP_SECONDS) + stepOffset;
  const message = Buffer.alloc(8);
  message.writeUInt32BE(counter, 4);
  const mac = createHmac("sha1", base32Decode(secret)).update(message).digest();
  const offset = mac[mac.length - 1] & 0xf;
  const code = mac.readUInt32BE(offset) & 0x7fffffff;
  return String(code % 1_000_000).padStart(6, "0");
}

/**
 * Checks a code against the previous, current and next 30 s step.
 *
 * @param secret - Base32-encoded shared secret.
 * @param code - The code typed by the user.
 * @param now - Time in ms since the epoch.
 * @returns True if the code matches one of the three steps.
 */
export function verifyTotp(secret: string, code: string, now = Date.now()): boolean {
  const given = Buffer.from(code);
  let ok = false;
  for (const offset of [-1, 0, 1]) {
    const expected = Buffer.from(generateTotp(secret, offset, now));
    if (given.length === expected.length && timingSafeEqual(given, expected)) ok = true;
  }
  return ok;
}
