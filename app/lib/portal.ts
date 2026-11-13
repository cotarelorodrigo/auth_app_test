// Server side of the portal test case: sessions and documents shared by the
// /api/portal/* routes. Everything lives in this process's memory, so the case
// needs a single server process.
//
// ⚠️ INTENTIONALLY VULNERABLE — see app/api/portal/documents/[id]/route.ts.
// For authorized security testing only. Do NOT ship this to a real/production
// deployment.

import { randomUUID } from "node:crypto";

export const COOKIE_NAME = "session";
const COOKIE_PATTERN = new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`);

export type Document = {
  id: string;
  owner: string;
  title: string;
  content: string;
};

// Fixed UUIDs so the case is reproducible. They are unguessable and no
// endpoint lists documents the caller doesn't own, so a tester only learns
// another user's IDs by logging in as that user.
export const DOCUMENTS: Document[] = [
  {
    id: "9dc34218-f0e5-4ea9-9e65-81efdead0946",
    owner: "testuser_01",
    title: "Invoice 2026-0412",
    content: "Invoice for testuser_01. Amount due: USD 1,250.00.",
  },
  {
    id: "0e3da7d3-c1fc-462f-8159-c88d10bdadf7",
    owner: "testuser_01",
    title: "Medical leave note",
    content: "Medical leave note for testuser_01. Diagnosis: confidential.",
  },
  {
    id: "4101d7b9-733b-40da-b776-1258697c6eec",
    owner: "testuser_02",
    title: "Bank transfer receipt",
    content: "Transfer receipt for testuser_02. Account ending 4821.",
  },
  {
    id: "4c0af183-9d7c-49a0-97b2-d6d966ce5c01",
    owner: "testuser_02",
    title: "Home address change",
    content: "Address change request for testuser_02: 742 Evergreen Terrace.",
  },
  {
    id: "b85ec7a3-55c7-45e1-81e8-201e8e509dc4",
    owner: "admin_test",
    title: "Payroll Q4 (confidential)",
    content: "Payroll Q4. CEO salary: USD 38,000/month. Admin eyes only.",
  },
  {
    id: "dda47e99-0a4d-46c2-b639-423dd42cab18",
    owner: "admin_test",
    title: "Production API keys rotation",
    content: "Rotated production API key: sk_live_51Hx9ZqT7vKd2LmPw. Admin eyes only.",
  },
];

// Kept on globalThis so every route shares one store even if the bundler
// gives each route its own copy of this module.
const globalStore = globalThis as typeof globalThis & { __portalSessions?: Map<string, string> };
const sessions = (globalStore.__portalSessions ??= new Map<string, string>());

/**
 * Opens a session for a user and returns its random token.
 *
 * @param username - The authenticated user.
 * @returns The session token to put in the cookie.
 */
export function createSession(username: string): string {
  const token = randomUUID();
  sessions.set(token, username);
  return token;
}

/**
 * Looks up the user behind a request's session cookie.
 *
 * @param req - The incoming request.
 * @returns The username, or null if the request has no valid session.
 */
export function getSessionUser(req: Request): string | null {
  const match = COOKIE_PATTERN.exec(req.headers.get("cookie") ?? "");
  return match ? (sessions.get(match[1]) ?? null) : null;
}
