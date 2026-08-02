# GitHub Releases and Automatic Desktop Updates

TxtHero uses GitHub Actions and GitHub Releases as its Linux desktop delivery
system. A release is published only after CI succeeds for the exact commit on
`main`. Installed AppImage builds check GitHub for newer stable releases and
never restart without the user's approval.

## What happens after a push

1. `.github/workflows/ci.yml` installs dependencies deterministically, audits
   npm and Python packages, runs the collaboration tests, validates Compose,
   and creates the production frontend build.
2. A successful `main` push triggers `.github/workflows/release.yml` through
   GitHub's `workflow_run` event.
3. The release workflow checks out the exact CI-tested commit SHA, reruns the
   security gates and tests, builds the standalone frontend and bundled
   FastAPI backend, and creates Linux AppImage and `.deb` packages.
4. Electron Builder publishes immutable artifacts, blockmaps, and
   `latest-linux.yml` to a versioned GitHub Release.
5. The packaged AppImage reads `latest-linux.yml`, offers the download, and
   asks again before installation.

Failed CI, tests, audits, builds, or packaging stop the workflow before a
release is published. Existing GitHub Releases remain available and installed
applications remain unchanged.

## Version and deployment identity

Automatic, manual, and recovery releases use the chronological format
`1.<UTC YYYYMMDD>.<Unix timestamp>`. This keeps every later release newer than
every earlier release, including after a rollback. The workflow stamps these values
into `electron/build-info.json` before packaging:

- exact 40-character Git commit SHA;
- source branch;
- UTC build timestamp;
- GitHub Release tag.

In the desktop application, choose **Help → About TxtHero** to see the installed
version and commit.

## User-controlled updates

- Background checks occur ten seconds after packaged startup and every four
  hours while TxtHero remains open.
- Choose **Help → Check for Updates…** for a manual check.
- TxtHero does not download an update until the user chooses **Download**.
- TxtHero does not install or restart until the user chooses
  **Install and Restart**.
- Reported unsaved Solo or Formatter changes block installation. Save/export
  the work, then choose **Help → Install Downloaded Update…**.
- Set `TXTHERO_DISABLE_AUTO_UPDATE=1` before launching to disable background
  checks; manual checks remain available.

Live collaboration uses Yjs synchronization and is not treated as an unsaved
local file. Users should still confirm the session is **Connected · synced**
before installing an update.

## Manual deployment

Run **Actions → Publish GitHub Desktop Release → Run workflow** on `main`. The
workflow checks out the selected workflow commit, validates it, assigns a new
monotonically increasing release version, and publishes it through the same
release path.

## Rollback and recovery

Desktop update clients do not safely downgrade to a lower semantic version.
Rollback therefore publishes the exact known-good code as a new, higher
recovery version:

1. Find the full known-good commit SHA from an update-enabled TxtHero release.
2. Choose **Actions → Publish Recovery Release → Run workflow**.
3. The workflow verifies that the commit belongs to `main`, checks it out in
   detached mode, reruns tests/audits/builds, and publishes new immutable
   artifacts.
4. Clients receive the recovery build through the normal update prompt.

Do not delete prior successful releases immediately. They are the artifact and
commit history used to choose a recovery source.

The recovery workflow deliberately rejects commits created before GitHub update
support was added. Such builds cannot receive the next automatic update and
would strand clients on the recovery version.

## Permissions and secrets

CI has read-only repository access. Release and recovery workflows receive only
`contents: write`, which Electron Builder uses through the ephemeral
`GITHUB_TOKEN`. No personal access token, SSH credential, signing key, or
production application secret is stored in the repository.

The Linux artifacts are currently unsigned. If package signing is added, store
the signing material in protected GitHub Actions secrets and never print it.

## Current platform boundary

GitHub automatic publishing currently supports Linux AppImage and `.deb`
artifacts. AppImage supports in-application differential updates; `.deb` users
should download and install the newer package from GitHub Releases. The current
Windows and macOS scripts do not yet bundle a platform-specific FastAPI binary,
so they are intentionally excluded rather than publishing incomplete packages.
