# Security Architecture

## Credential authority

Clerk is the sole credential and session authority. TxtHero has no password table, password hash, login handler, signup handler, reset token, custom JWT, or custom session cookie. Consequently Sections 3–6 of the security request are not implemented as a parallel custom login system; doing so would undermine Section 7’s instruction to remove custom auth.

Clerk owns:

- email/password validation and normalization;
- Argon2/bcrypt-equivalent credential storage managed by Clerk;
- constant-time credential verification;
- email verification and password reset;
- per-IP and per-account abuse controls;
- Google and GitHub OAuth;
- session creation, rotation, and revocation.

There is no legacy password data to bulk-migrate and no one-off password migration script is appropriate.

## Clerk setup

1. Create a Clerk application.
2. Configure the variables in `.env.example`.
3. Enable email/password and require email verification.
4. Enable Google and GitHub under **Social Connections**.
5. Configure production origins and redirect URLs.
6. Create `/api/webhooks/clerk`, subscribe to `user.created` and `user.deleted`, and set `CLERK_WEBHOOK_SECRET`.
7. Enable Clerk attack protection and review bot/sign-in limits for the plan.

The requested custom Redis thresholds conflict internally (“return 429 beyond ten” and “never return 429”) and are superseded by Clerk. Do not add an observable local `/login` proxy. Test throttling against a non-production Clerk tenant and verify the Clerk UI remains enumeration-safe.

## Zero-client-trust boundaries

- Contact JSON is parsed and validated by Zod before mail logic.
- Preferences accept only explicitly enumerated keys and values.
- Upload size, filename, and actual magic bytes are checked server-side.
- Collaboration discovery codes and participant credentials are validated by FastAPI before WebSocket acceptance.
- Clerk webhook signatures are verified before user metadata changes.
- Rejections return generic errors; rule detail is logged server-side without request bodies.

## Live collaboration security

- A 6-digit code is discovery data, not authorization. Each participant uses an independent 256-bit random bearer credential.
- Host credentials can approve or reject guests, change editor/viewer roles, revoke participants, and end the session.
- Viewer document-update frames are rejected by the WebSocket adapter; toolbar hiding is not treated as enforcement.
- Join requests are throttled to five attempts per client address per minute.
- Sessions expire after 15 minutes to 8 hours, support at most 15 participants, and remain in process memory.
- CRDT contents are ephemeral unless `COLLAB_PERSIST_UPDATES=true` is explicitly configured.
- Awareness data—names, colors, cursors, selections, and typing activity—is never persisted.
- Diagnostic room listings are unavailable unless `COLLAB_DIAGNOSTICS_TOKEN` is configured and supplied.
- Collaboration exposes no filesystem paths, directory listings, file handles, arbitrary file APIs, shell, or desktop control.
- Production deployments must terminate HTTPS/WSS at the application or trusted reverse proxy.

The relay currently decrypts Yjs updates after TLS termination and is therefore a trusted relay, not an end-to-end encrypted relay. Do not describe Live as E2E encrypted until a reviewed client-side key exchange and payload-encryption design is implemented.

## Metadata record

TxtHero stores only:

```json
{
  "clerkUserId": "user_...",
  "plan": "free",
  "preferences": {},
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

Deletion webhooks delete the metadata record. No credentials, password hashes, tokens, email addresses, or sessions are stored.

## Upload controls

- Maximum file size: 50 MiB, checked from Content-Length and the resulting File.
- MIME allowlist: detected with `file-type` magic bytes.
- Traversal: absolute paths, separators, and `..` are rejected.
- Directories use mode `0700`; data and metadata files use `0600`.
- Files live outside `public/`.
- Downloads require the same Clerk user and use attachment disposition.
- Responses include `nosniff`, private/no-store caching, and a sandbox CSP.
- Uploaded bytes are never executed.

For public production, replace local storage with a private S3-compatible bucket, block all public access, add malware quarantine, and use short-lived owner-scoped access.

## Source and history scan

The July 24, 2026 scan found no embedded API key, database URI, private key, OAuth secret, JWT secret, or credential. Compose references such as `${CLERK_SECRET_KEY:-}` are environment interpolation, not secret values.

Repeat:

```bash
git log --all --full-history -- "*.env" ".env*"
git grep -I -n -E '(sk_live_|pk_live_|ghp_|AKIA|BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY)' $(git rev-list --all)
```

If a secret appears in history, rotate it first, then purge:

```bash
git filter-repo --path .env --path frontend/.env.local --invert-paths
git push --force --all
git push --force --tags
```

Every collaborator must re-clone after history rewriting.
