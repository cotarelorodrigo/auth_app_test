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
