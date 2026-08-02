# Live Collaboration Implementation Checklist

This document tracks implementation against
`live-collaboration-spec.md`. A box is checked only after the corresponding
behavior has been implemented and verified. Work proceeds one coherent feature
at a time; unchecked items are not claims of partial support.

## Current iteration: Create Session

Source: specification sections 6.1, 7.1, 17, 18, and 26.

- [x] Clicking **Create session** requests a new session from FastAPI.
- [x] The server generates a cryptographically random internal session UUID.
- [x] The server generates a collision-checked 6-digit numeric discovery code.
- [x] Session creation applies the selected expiration time.
- [x] The host receives a separate high-entropy, session-scoped credential.
- [x] The session is bound to one opaque collaborative Yjs document rather than a filesystem path.
- [x] The response contains the session code, UUID, host participant ID, expiration, mode, participant limit, approval setting, and host credential.
- [x] After creation, the Live editor opens without remounting TipTap during Yjs initialization.
- [x] The session code is displayed in the Live title bar and Share panel.
- [x] The Share panel produces a QR code and copyable join URL containing no file contents or filesystem paths.
- [x] Packaged Electron smoke test confirms that Create Session reaches the collaborative editor instead of the failed-load page.

## Next iterations

- [ ] Guest joins using the 6-digit code.
- [ ] Guest joins using an in-app QR scanner.
- [ ] Host approval and rejection are verified in packaged Electron.
- [ ] Editor/viewer enforcement is verified with two packaged clients.
- [ ] Participant removal and session termination are verified with two packaged clients.
- [ ] Reconnection and local edit recovery are verified under network interruption.
- [ ] Online, idle, typing, cursor, and selection presence are verified.
- [ ] Alt + Hover edit attribution uses stable Yjs-relative ranges.
- [ ] Explicit file/project sharing uses opaque logical file IDs.
- [ ] Multi-user behavior is load-tested with 2, 5, 10, and 15 participants.
- [ ] Production HTTPS/WSS rejection and credential-expiration tests pass.
- [ ] End-to-end encryption architecture is decided and documented.

## Verification record

| Date | Feature | Result | Evidence |
| --- | --- | --- | --- |
| 2026-08-02 | Create Session API | Passed | Unit/API session tests and scoped-credential response |
| 2026-08-02 | Create Session packaged UI | Passed after fix | Electron CDP smoke test; no TipTap command-manager exception |
| 2026-08-02 | Dependency security audit | Passed | npm and pip advisory scans report no known vulnerabilities |

## Defect resolved in this iteration

Before this fix, the Live editor mounted TipTap while the Yjs provider was still
`null`, then recreated the editor when the provider arrived. The collaboration
caret extension accessed the destroyed editor command manager and Electron
displayed **This page couldn't load**. `CollabEditor` now waits for both the
`Y.Doc` and provider before mounting `Editor`; role changes update editability
on the existing editor instead of reconstructing its collaboration extensions.
