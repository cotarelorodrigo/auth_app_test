# TestAuth — 2FA Demo

A minimal two-factor authentication demo app built with vanilla HTML/CSS/JS. No dependencies, no backend — runs entirely in the browser.

## Features

- Step 1: Username + password login
- Step 2: TOTP verification (RFC 6238 compliant)
- TOTP implemented with the native `crypto.subtle` Web API
- 30-second countdown timer
- Supports Google Authenticator, Authy, and any standard TOTP app

## Usage

Just open `index.html` in a browser — no build step needed.

To test, add a user's TOTP secret manually in your authenticator app, then log in with their credentials.

## Setup

```bash
git clone <your-repo-url>
cd testauth
open index.html
```

## Tech

- Vanilla HTML/CSS/JS
- TOTP: RFC 6238 via `crypto.subtle` (no libraries)
- Zero dependencies

## Google Sign-In test case

`/google-login` is a second login case: a single "Sign in with Google"
button that opens a new tab running a real Google OAuth 2.0
authorization-code flow (not a mock).

To make it actually work, create an OAuth client in
[Google Cloud Console](https://console.cloud.google.com/apis/credentials)
and authorize this redirect URI:

```
<your-origin>/api/auth/google/callback
```

Then set these in `.env.local` (already gitignored):

```
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

Without these, `/google-login` still renders but the flow fails with a
clear "not configured" error instead of silently breaking.

## Google FedCM test case

`/google-fedcm` is a third login case, distinct from `/google-login`:
instead of a top-level redirect in a new tab, it uses Google Identity
Services (GIS) with `use_fedcm_for_prompt: true`, so the browser itself
mediates the login via its native FedCM identity dialog — no redirect,
no new tab. The resulting ID token is verified server-side against
Google's `tokeninfo` endpoint in `app/api/auth/google/fedcm-verify`.

It reuses `GOOGLE_CLIENT_ID` from `.env.local`, but GIS additionally
requires the page's origin to be allow-listed. In the same OAuth client
in Google Cloud Console, add under **Authorized JavaScript origins**:

```
http://localhost:3000
```

(and any other origin you serve this app from).

## Google reCAPTCHA v2 test case

`/recaptcha-login` is a fourth login case: a local username/password form
(same test users as the 2FA case) gated by Google's real reCAPTCHA v2
checkbox widget ("I'm not a robot"). Submit stays disabled until the
widget resolves and hands back a token; the server then verifies that
token against Google's `siteverify` endpoint (`app/api/auth/recaptcha/verify`)
before checking the credentials.

`.env.local` ships pre-filled with
[Google's official test key pair](https://developers.google.com/recaptcha/docs/faq)
for reCAPTCHA v2 — it always shows the checkbox and always passes
verification, but only on `localhost`:

```
RECAPTCHA_SITE_KEY=6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI
RECAPTCHA_SECRET_KEY=6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe
```

To test against a real site key instead, register a **v2 Checkbox**
site in the [reCAPTCHA admin console](https://www.google.com/recaptcha/admin)
for the domain you're serving from, and swap in that site key/secret.

Without `RECAPTCHA_SITE_KEY` / `RECAPTCHA_SECRET_KEY` configured,
`/recaptcha-login` still renders but shows a clear "not configured"
error instead of silently breaking.

## Google reCAPTCHA v3 test case

`/recaptcha-v3-login` is a fifth login case, distinct from
`/recaptcha-login`: instead of a visible checkbox widget, it uses
reCAPTCHA v3 (invisible, score-based). The page calls
`grecaptcha.execute(siteKey, { action: "login" })` on submit with no
widget to solve, and the server (`app/api/auth/recaptcha-v3/verify`)
checks the token, the action, and the risk score — at least
`RECAPTCHA_MIN_SCORE` (default `0.5`) — before checking the
credentials. It fails closed on Google's over-quota `siteverify`
response (HTTP 200 `success:true` with a static score plus an error).

v3 site/secret keys are a separate key type from the v2 checkbox keys
used by `/recaptcha-login`, so this case has its own env vars. Add
these to `.env.local`:

```
RECAPTCHA_V3_SITE_KEY=your-v3-site-key
RECAPTCHA_V3_SECRET_KEY=your-v3-secret-key
RECAPTCHA_MIN_SCORE=0.5
```

Unlike v2, Google does not publish an official v3 test key pair, so
register a **v3 (score based)** site in the
[reCAPTCHA admin console](https://www.google.com/recaptcha/admin) for
the domain you're serving from.

Without `RECAPTCHA_V3_SITE_KEY` / `RECAPTCHA_V3_SECRET_KEY` configured,
`/recaptcha-v3-login` still renders but shows a clear "not configured"
error instead of silently breaking.

## Image CAPTCHA test case

`/image-captcha-login` is a custom-CAPTCHA login case: username/password
(same test users as the other cases) plus a classic distorted-text image
CAPTCHA. The server makes a 6-character CAPTCHA with `svg-captcha`, renders
it as a 300x100 PNG with `@resvg/resvg-js` (`GET /api/auth/image-captcha`),
and keeps the answer in memory: it is never in the page, the cookie, or any
response. The agent has to read the image. No keys or third-party service
needed.

The image response sets an httpOnly cookie (`image_captcha_id`) holding only
a random challenge ID. `POST /api/auth/image-captcha/verify` checks the
typed text (case-insensitive, trimmed) before the credentials. Each
challenge works for one attempt only, correct or not, and expires after
300 s; each new image replaces the cookie, so only the last image the
browser loaded is valid. At most 1000 open challenges are kept (oldest
dropped first), and answers live in process memory, so run a single server
process.

Success: HTTP 200 `{"ok": true, "role": "..."}`. Errors: 400
`missing_captcha`; 401 `captcha_failed` or `invalid_credentials`.

## HTTP Basic (curl) test case

`/api/auth/basic` is a sixth login case with no UI: it authenticates a
request from its `Authorization: Basic <base64(user:password)>` header,
so it is meant to be exercised with `curl`. Accepts `GET` and `POST`.

Set the accepted credentials in `.env.local`:

```
BASIC_AUTH_USER=your-client-id
BASIC_AUTH_PASSWORD=your-client-secret
```

```bash
curl -i http://localhost:3000/api/auth/basic \
  -H "Authorization: Basic $(printf '%s:%s' "$BASIC_AUTH_USER" "$BASIC_AUTH_PASSWORD" | base64 | tr -d '\n')"
```

Returns `200 {"ok":true,"user":...}` on a match. A missing, malformed or
wrong header returns `401` with `WWW-Authenticate: Basic`; without the
env vars configured it returns `500 not_configured`.
