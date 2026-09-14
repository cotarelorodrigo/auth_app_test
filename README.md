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
