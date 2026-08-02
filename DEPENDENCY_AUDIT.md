# Dependency Audit — July 24, 2026

## Before remediation

┌─────────────────────────────────────────────────────────────┐
│ Package:    postcss                                         │
│ Severity:   HIGH                                            │
│ Issue:      CSS stringify XSS and source-map file read      │
│ Current:    <=8.5.11 nested through Next                    │
│ Safe fix:   8.5.22 (override)                               │
│ Action:     Pinned patched version across dependency tree   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Package:    sharp                                           │
│ Severity:   HIGH                                            │
│ Issue:      Inherited 2026 libvips vulnerabilities          │
│ Current:    <0.35.0 nested through Next                     │
│ Safe fix:   0.35.3 (override)                               │
│ Action:     Pinned patched compatible version               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Package:    shell-quote                                     │
│ Severity:   HIGH                                            │
│ Issue:      Quadratic-complexity denial of service          │
│ Current:    <=1.8.4 through concurrently                    │
│ Safe fix:   1.10.0 (override)                               │
│ Action:     Pinned patched version in Electron workspace    │
└─────────────────────────────────────────────────────────────┘

`npm audit` also reports parent packages Next and concurrently as affected, so the initial metadata counted five high entries even though there were three vulnerable leaf packages.

## Actions

- Ran `npm audit --json` in the root workspace and `frontend/`.
- Ran non-breaking `npm audit fix`; npm incorrectly proposed `next@9.3.3` under `--force`.
- Did not use `--force`.
- Checked current registry releases.
- Added compatible patched overrides for PostCSS, Sharp, and shell-quote.
- Reinstalled lockfiles and ran both audits again.

## After remediation

Both audit reports:

```json
{
  "vulnerabilities": {
    "info": 0,
    "low": 0,
    "moderate": 0,
    "high": 0,
    "critical": 0,
    "total": 0
  }
}
```
