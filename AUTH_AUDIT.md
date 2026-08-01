# Authentication Audit

## Section 3 — Input validation

TxtHero does not receive login or signup request bodies. Clerk’s SDK/components send credentials directly to Clerk, so adding a local email/password/username/name schema would create a second credential boundary and violate the requirement to replace custom auth.

| Field | Authority | TxtHero exposure |
| --- | --- | --- |
| Email | Clerk | Not stored in TxtHero metadata |
| Password | Clerk | Never received, logged, echoed, hashed, or compared by TxtHero |
| Username | Clerk, if enabled | Not accepted by a TxtHero endpoint |
| Display name | Clerk profile | Not accepted by a TxtHero endpoint; collaboration guest names stay local and are rendered as React text |

Inputs TxtHero owns are validated in `frontend/src/lib/server/validation.js` before business logic. Rejections return `{"error":"Invalid request"}` and log timestamp, IP, user-agent, and rule without logging the body.

## Section 4 — Brute-force protection

There is no `POST /login` in this repository. Clerk owns sign-in endpoints, attack protection, bot detection, account protection, notification, and rate limiting.

The requested rules contain a direct contradiction:

- “Beyond 10: return 429”
- “Never return 429 to a login attempt”

Because Section 7 orders removal of custom login handlers, Clerk’s enumeration-safe response and dashboard controls take precedence. Exact Redis thresholds cannot be imposed on Clerk-hosted credential requests from this codebase. Configure and test Clerk attack protection in a non-production tenant.

## Section 5 — Password storage

Whole-source searches found:

- no password column or JSON property;
- no plaintext, MD5, SHA-1, bcrypt, Argon2, or password comparison implementation;
- no custom reset or password-change handler;
- no request-body logging.

The word “password” appears only in privacy/security documentation and Clerk setup text. There is no legacy hash to migrate, so a migration function or bulk rehash script would be dead and misleading code.

## Section 6 — Enumeration-safe errors

TxtHero private file routes return an empty 404 for invalid IDs, unauthorized owners, missing objects, and deletion failures. Validation uses generic 400 responses. Clerk owns external credential and reset messages.

Source search results:

| Old string | Location | Action |
| --- | --- | --- |
| `File not found` | FastAPI file service | Replaced with `Resource unavailable` |
| `Collaboration room not found` | FastAPI collaboration route | Replaced with `Resource unavailable` |

No instances of `invalid email`, `already registered`, `email taken`, `wrong password`, `incorrect password`, `account locked`, or `too many attempts` exist in application source.

## Section 7 — Clerk integration

- `ClerkProvider` conditionally wraps hosted builds.
- `clerkMiddleware` protects dashboard, formatter, private files, and preferences when configured.
- Clerk sign-in/sign-up components handle credentials.
- `UserButton` supplies account and sign-out controls.
- The webhook verifies its Svix signature before writes.
- `user.created` writes only the approved metadata.
- `user.deleted` deletes the metadata row.
- No password, hash, token, email, or session is stored.

Google and GitHub are enabled in the Clerk dashboard under **Social Connections**; no OAuth client secret belongs in browser code.
