# Launch Checklist

## Product

- [ ] Format representative JS, TS, Flow, CSS, HTML, Vue, Angular, Markdown, JSON, YAML, GraphQL, and Handlebars files.
- [ ] Edit and reopen representative XLSX files with formulas, styles, charts, and multiple worksheets.
- [ ] Edit representative DOCX paragraphs and confirm untouched media/styles remain.
- [ ] Edit representative PPTX text blocks and confirm layout/media remain.
- [ ] Export PDFs and confirm original pages plus edited accessible-text pages.
- [ ] Confirm unknown binaries download byte-identically.
- [ ] Test mobile, tablet, and desktop layouts.
- [ ] Test light, dark, and system themes.
- [ ] Test keyboard shortcuts and screen-reader labels.
- [ ] Test two-user collaboration, reconnection, and restart recovery.

## Clerk

- [ ] Production Clerk keys configured.
- [ ] Email/password and mandatory email verification enabled.
- [ ] Google OAuth enabled and tested.
- [ ] GitHub OAuth enabled and tested.
- [ ] Password reset tested.
- [ ] Webhook endpoint is HTTPS and signature verification passes.
- [ ] `user.created` creates the approved metadata record.
- [ ] `user.deleted` removes the metadata record.
- [ ] Clerk attack protection tested in a non-production tenant.

## Upload security

- [ ] 50 MiB boundary tested at application and reverse proxy.
- [ ] Magic-byte mismatch returns 415.
- [ ] Traversal filenames are rejected.
- [ ] Owner A cannot read or delete owner B’s object.
- [ ] Downloads include attachment, no-sniff, sandbox CSP, and no-store.
- [ ] Production storage is private and malware quarantine is enabled.

## Secrets and dependencies

- [ ] Root and frontend `npm audit --json` return zero vulnerabilities.
- [ ] Source and Git-history secret scans completed.
- [ ] Any historically exposed secret rotated.
- [ ] `.env.local` and deployment secrets are not committed.

## Legal and operations

- [ ] Counsel approves privacy, terms, governing law, and retention language.
- [ ] `SUPPORT_EMAIL`, SMTP, `SITE_URL`, and Search Console verification configured.
- [ ] Consent behavior and provider list match the production deployment.
- [ ] Privacy access/deletion/export workflow documented and tested.
- [ ] Backups and restore drill completed.
- [ ] Monitoring, alerting, incident response, and status page configured.
- [ ] Clerk, storage, and email provider DPAs reviewed.

## Desktop

- [ ] Linux `.deb` installs, launches both services, saves, and shuts down cleanly.
- [ ] Windows backend executable and NSIS package built/tested on Windows.
- [ ] macOS backend executable, signing, notarization, and DMG tested on macOS.
- [ ] Upgrade preserves user-data directories.
- [ ] Uninstall behavior is documented.
