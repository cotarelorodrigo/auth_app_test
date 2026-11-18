# Cookie Banner Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the `/cookie-banner-login` case: a username/password login whose button is covered by a fixed cookie banner until the banner is dismissed.

**Architecture:** One client page (`app/cookie-banner-login/page.tsx`, modeled on `app/image-captcha-login/page.tsx`) plus one API route that checks credentials against `USERS`. The card is bottom-anchored and the banner is `position: fixed` at the bottom, so the button sits at a constant distance from the viewport bottom and the banner covers it at any window height.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript. No test framework in the repo.

**Spec:** `docs/superpowers/specs/2026-11-18-cookie-banner-login-design.md`

## Global Constraints

- Same test users as the other cases (`app/lib/users.ts`) and the same success screen text "Acceso concedido".
- `app/lib/users.ts` must stay server-side: never import it from a `'use client'` file.
- API contract: `POST /api/auth/cookie-banner/login`, body `{username, password}`; `200 {"ok":true,"role":...}` or `401 {"error":"invalid_credentials"}`; validates with `Object.hasOwn`; a malformed body counts as empty credentials (401); sets no cookies.
- Both "Aceptar" and "Rechazar" close the banner. The banner reappears on every page load: no cookie, `localStorage` or `sessionStorage`.
- Login button: always enabled (disabled only while verifying), no `<form>`, no Enter handler, no focus trap on the banner.
- No test framework and no new dependency in `package.json`. Throwaway check scripts live in the scratchpad directory, not in the repo.
- UI copy in Spanish. README section in English, titled "Cookie banner test case", at the end of the file.
- Pre-commit: the repo has no pytest or ruff, so the only applicable checks are `npm run lint` and `npx tsc --noEmit`. Run them before each commit.
- Commit messages follow `feat(auth): ...` and end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

- Non-string or non-JSON bodies (`not json`, `{"username":123,"password":null}`, missing fields) return 401, never 500. (Task 1)
- Usernames that are prototype keys (`__proto__`, `constructor`, `toString`) return 401. (Task 1)
- Pressing Enter in a field with the banner open sends no login request. (Task 2)
- The banner covers the button center at other window sizes (1366×768, 1920×1080), not just one. (Task 2)
- After a wrong password the error shows, the button does not move, and a retry with the right password succeeds. (Task 2)

---

### Task 1: Login API route

**Files:**
- Create: `app/api/auth/cookie-banner/login/route.ts`

**Interfaces:**
- Produces: `POST /api/auth/cookie-banner/login` as in Global Constraints. Task 2 calls it with `fetch`.

- [ ] **Step 1: Implement `export async function POST(req: NextRequest): Promise<Response>`**

Mirror `app/api/auth/2fa/login/route.ts` for body parsing and the `USERS` lookup (`req.json().catch(() => ({}))`, string checks, `Object.hasOwn`, `user.password !== password`). On a match return `Response.json({ ok: true, role: user.role })`; otherwise `Response.json({ error: 'invalid_credentials' }, { status: 401 })`. Do not set any cookie.

- [ ] **Step 2: Start the dev server and run the checks**

Run `npm run dev` in the background (base URL `http://localhost:3000`; reuse a server already running there). Then, with `curl -s -i -X POST http://localhost:3000/api/auth/cookie-banner/login -H 'Content-Type: application/json' -d '<body>'`:

| Body | Expected |
|---|---|
| `{"username":"testuser_01","password":"Test@1234!"}` | `200 {"ok":true,"role":"Usuario"}` |
| `{"username":"admin_test","password":"Admin@Pass99!"}` | `200 {"ok":true,"role":"Admin"}` |
| `{"username":"testuser_01","password":"wrong"}` | `401 {"error":"invalid_credentials"}` |
| `not json` | `401 {"error":"invalid_credentials"}` |
| `{"username":123,"password":null}` | `401 {"error":"invalid_credentials"}` |
| `{"username":"testuser_01"}` | `401 {"error":"invalid_credentials"}` |
| `{"username":"__proto__","password":"x"}`, same with `constructor` and `toString` | `401 {"error":"invalid_credentials"}` |

No response may include a `Set-Cookie` header, and none may be a 500.

- [ ] **Step 3: Lint, typecheck, commit**

Run `npm run lint` and `npx tsc --noEmit` (both clean), then:

```bash
git add app/api/auth/cookie-banner/login/route.ts
git commit -m "feat(auth): add login endpoint for the cookie-banner case"
```

(Add the attribution trailer from Global Constraints.)

---

### Task 2: Login page with the covering banner, and README

**Files:**
- Create: `app/cookie-banner-login/page.tsx`
- Modify: `README.md` (append a section at the end)

**Interfaces:**
- Consumes: `POST /api/auth/cookie-banner/login` from Task 1.
- Produces: the page at `/cookie-banner-login`. The banner root has `role="region"` and `aria-label="Aviso de cookies"`; its buttons are "Rechazar" and "Aceptar". The check script in Step 2 relies on these.

- [ ] **Step 1: Implement `export default function CookieBannerLoginPage()`** (`'use client'`)

Copy the structure, CSS classes and state shape of `app/image-captcha-login/page.tsx`, minus the CAPTCHA parts: `status: 'login' | 'verifying' | 'success' | 'error'`, `username`, `password`, `errorReason`, `role`, plus `bannerOpen` (initial `true`). Specifics:

- Constants at the top of the file, side by side: `LOGIN_PATH = '/api/auth/cookie-banner/login'`, `CARD_BOTTOM_GAP = 24` (px), `BANNER_HEIGHT = 96` (px).
- Logo name "TestAuth · Cookie banner". Subtitle (`fsub`): "Usuario + contraseña. Un aviso de cookies puede interponerse en el camino."
- Button "Continuar →" (`btn bp`, `onClick` only; "Verificando…" while `status === 'verifying'`). Success screen "Acceso concedido", "Credenciales verificadas server-side.", the `username · role` badge, and "Volver a iniciar sesión", which clears the form but does not reopen the banner.
- Error messages: `invalid_credentials` → "Usuario o contraseña incorrectos."; network failure → "Error de red al hablar con el servidor."
- Layout: `.wrap` gets `style={{ alignSelf: 'flex-end', marginBottom: CARD_BOTTOM_GAP }}` so the card hangs from the bottom of the (flex-centered) body.
- Banner: sibling of `.wrap` (not inside the card), rendered only while `bannerOpen`. Inline styles: `position: 'fixed'`, `left: 0`, `right: 0`, `bottom: 0`, `height: BANNER_HEIGHT`, `boxSizing: 'border-box'`, `zIndex: 1000`, opaque background using the existing `var(--surface)` / `var(--border)` tokens, flex row with the text on the left and the two buttons on the right (reuse `btn bg` / `btn bp` with inline `width: 'auto'` and `marginTop: 0`). Text: "Usamos cookies para mejorar tu experiencia. Podés aceptarlas o rechazarlas." Both buttons call `setBannerOpen(false)`.
- Starting values (`24` / `96`) assume a ~43px-tall button whose bottom edge sits ~61px above the viewport bottom. If the measured button rect in Step 2 breaks the invariant below, adjust only `BANNER_HEIGHT`.

- [ ] **Step 2: Check it in a real browser**

With the dev server running, write a throwaway script `/private/tmp/claude-501/-Users-rodrigocotarelo-GIT-auth-app-test/6368a9ad-4302-444e-9ee4-0939e813fce5/scratchpad/check-cookie-banner.mjs` using `playwright-core` installed in that scratchpad directory (not in the repo), launching Chrome with `channel: 'chrome'`. For viewports 1280×720, 1366×768 and 1920×1080, on a fresh load of `http://localhost:3000/cookie-banner-login`, assert:

1. `document.elementFromPoint` at the center of the "Continuar →" button returns an element inside `[aria-label="Aviso de cookies"]`.
2. The visible part of the button above the banner is between 0 and 12 px.
3. Pressing Enter in the password field (after filling both fields) sends no request to `/api/auth/cookie-banner/login`.
4. Clicking "Aceptar" removes the banner, and `elementFromPoint` at the same point now returns the button.
5. Filling `testuser_01` / `Test@1234!` and clicking the button shows "Acceso concedido" and the badge `testuser_01 · Usuario`.

Then, once on 1280×720, reload (the banner must be back) and click "Rechazar" this time. Fill `testuser_01` / `wrong` and click the button: "Usuario o contraseña incorrectos." appears and the button's bounding rect has not moved. Fix the password and click again: "Acceso concedido".

Run the script; it must exit 0. Also confirm in the dev server log (middleware) that `POST /api/auth/cookie-banner/login` shows up only for the actual login clicks, never for the Enter press from check 3.

- [ ] **Step 3: Append the README section**

Add `## Cookie banner test case` at the end of `README.md`, in English and in the style of the other sections: the route `/cookie-banner-login`; a cookie banner fixed at the bottom covers the center of the login button, so the agent has to dismiss it ("Aceptar" or "Rechazar") before a click reaches the button; the banner reappears on every page load; Enter does not submit; the server does not require consent; `POST /api/auth/cookie-banner/login` with `{"username","password"}` returns `200 {"ok":true,"role":"..."}` or `401 {"error":"invalid_credentials"}`; the request log from `middleware.ts` shows whether the click landed; no env vars needed.

- [ ] **Step 4: Lint, typecheck, commit**

Run `npm run lint` and `npx tsc --noEmit` (both clean). Stop the dev server. Then:

```bash
git add app/cookie-banner-login/page.tsx README.md
git commit -m "feat(auth): add cookie-banner login case where a banner covers the button"
```

Then commit the spec and this plan on their own:

```bash
git add docs/superpowers/specs/2026-11-18-cookie-banner-login-design.md docs/superpowers/plans/2026-11-18-cookie-banner-login.md
git commit -m "docs(auth): add spec and plan for the cookie-banner login case"
```

(Add the attribution trailer to both commits.)
