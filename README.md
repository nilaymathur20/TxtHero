# TxtHero — Complete Documentation

TxtHero is a focused writing workspace built with Next.js, FastAPI, and Electron. It provides a browser-based editor during development and can be packaged as a desktop application for Linux, Windows, and macOS.

TxtHero now has two complementary editing modes:

- **Solo** at `/`: the original lightweight textarea and REST-backed local files.
- **TxtHero Live** at `/collab`: privacy-scoped Yjs collaboration with 6-digit session codes, separate participant credentials, host approval, editor/viewer roles, live cursors, typing presence, QR invitations, and reconnection.

## Quick Navigation

- [Requirements & Installation](#requirements--installation)
- [Development](#development)
- [Docker Deployment](#docker-deployment)
- [Desktop Packages](#desktop-packages)
- [REST API Reference](#rest-api-reference)
- [WebSocket Collaboration](#websocket-collaboration)
- [Code Blocks & Shortcuts](#code-blocks--shortcuts)
- [Font Library](#font-library)
- [Universal Formatter](#universal-formatter)
- [Architecture & Design](#architecture--design)
- [Security](#security)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)
- [Launch Checklist](#launch-checklist)

---

## Requirements & Installation

### What You Need

- Node.js 20.9 or newer
- npm
- Python 3.10 or newer
- Git
- Optionally: Docker Engine 24.0+ and Docker Compose v2+ for containerized deployment

Verify your installation:

```bash
node --version
npm --version
python3 --version
```

For Docker:

```bash
docker --version
docker compose version
```

### Beginner Setup Guide

#### 1. Install Platform Tools

**Ubuntu 22.04+**

```bash
sudo apt update
sudo apt install -y git python3 python3-venv python3-pip curl
```

Install Node.js 20+ using your organization's approved installer.

**macOS 12+**

```bash
xcode-select --install
brew install git node python
```

**Windows 10/11 PowerShell**

Install Git, Node.js LTS, and Python from their official installers. Enable "Add Python to PATH."

#### 2. Clone and Install Dependencies

```bash
git clone https://github.com/nilaymathur20/TxtHero.git
cd TxtHero
npm install
npm --prefix frontend install
python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements.txt
```

Windows PowerShell equivalents:

```powershell
py -m venv backend/.venv
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
```

#### 3. Verify Installation

After setup completes, test that all components are available:

```bash
npm run backend &
npm run dev:web
```

- Solo editor: `http://localhost:3000/`
- Collaborative editor: `http://localhost:3000/collab`
- API docs: `http://127.0.0.1:8000/docs`

---

## Development

### Project Structure

```text
TxtHero/
├── backend/              FastAPI application and saved documents
│   ├── app/             Application routers and services
│   ├── documents/       User-saved documents and collaboration state
│   ├── Dockerfile       Backend containerization
│   ├── requirements.txt  Python dependencies
│   └── run.py           Server entry point
├── frontend/            Next.js application
│   ├── src/            React components and utilities
│   ├── app/            Next.js pages and API routes
│   ├── Dockerfile      Frontend containerization
│   ├── package.json    Dependencies
│   └── next.config.mjs Next.js configuration
├── electron/           Electron desktop wrapper
│   └── main.js        Entry point
├── release/            Generated desktop packages
├── docker-compose.yml           Production container orchestration
├── docker-compose.dev.yml       Development with hot-reload
├── package.json                 Workspace configuration
└── README.md                    This file
```

### Available Commands

Run these from the project root:

| Command | Purpose |
| --- | --- |
| `npm run backend` | Start FastAPI with automatic reload |
| `npm run frontend` | Start the Next.js development server |
| `npm run electron` | Open Electron after frontend is available |
| `npm run dev` | Start the complete desktop development environment |
| `npm run dev:web` | Start API and browser interface only |
| `npm run build` | Build the production standalone Next.js frontend |
| `npm run dist:linux` | Create Linux package |
| `npm run dist:windows` | Create Windows NSIS installer |
| `npm run dist:mac` | Create macOS DMG |
| `npm run dist:all` | Attempt all platform builds |

### Browser Development

To run TxtHero only in a browser:

```bash
npm run dev:web
```

Then open <http://localhost:3000>.

Development services:

| Service | Address |
| --- | --- |
| Web application | <http://localhost:3000> |
| API | <http://127.0.0.1:8000> |
| API documentation | <http://127.0.0.1:8000/docs> |

### Testing Collaboration

To test real-time collaboration with multiple users, open this URL in two separate browser profiles:

```
http://localhost:3000/collab
```

Each browser profile creates a separate guest identity. Tabs in the same profile intentionally share identity.

### Environment Configuration

Copy `.env.example` values into your shell or deployment configuration:

```bash
export NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
export NEXT_PUBLIC_WS_URL=ws://127.0.0.1:8000
```

For deployment behind HTTPS, use `wss://` for WebSocket URLs:

```bash
export NEXT_PUBLIC_WS_URL=wss://your-domain.com
```

Next.js public variables (those starting with `NEXT_PUBLIC_`) are embedded during the frontend build. Set them before running `npm run build` or `docker compose up`.

---

## Docker Deployment

Run TxtHero in isolated containers without installing Node.js, Python, or dependencies on your host. Docker is the recommended way to deploy in production and share a consistent development environment.

### Requirements

- Docker Engine 24.0 or newer
- Docker Compose v2 or newer

Verify installation:

```bash
docker --version
docker compose version
```

### Quick Start (Production)

Build and start TxtHero in production mode:

```bash
docker compose up -d --build
```

Access the application:

| Service | URL |
| --- | --- |
| Frontend | <http://localhost:3000> |
| Backend API | <http://localhost:8000> |
| API docs | <http://localhost:8000/docs> |

Stop the containers:

```bash
docker compose down
```

### Development Mode with Hot-Reload

Use `docker-compose.dev.yml` to run TxtHero with hot-reload enabled. Source files on the host are mounted into containers so code changes appear immediately.

Start the development stack:

```bash
docker compose -f docker-compose.dev.yml up --build
```

Any change to `backend/app/` or `frontend/src/` is reflected without rebuilding the image.

### Available Docker Commands

Run these from the project root:

| Command | Purpose |
| --- | --- |
| `docker compose up -d --build` | Build and start all services in background |
| `docker compose up --build` | Build and start with logs attached |
| `docker compose down` | Stop and remove containers |
| `docker compose down -v` | Stop containers and remove volumes |
| `docker compose ps` | Show running containers |
| `docker compose logs -f` | Follow container logs |
| `docker compose logs -f backend` | Follow backend logs only |
| `docker compose logs -f frontend` | Follow frontend logs only |
| `docker compose restart backend` | Restart backend container |
| `docker compose exec backend bash` | Open shell in backend |
| `docker compose exec frontend sh` | Open shell in frontend |

### Building Individual Images

Build the backend image:

```bash
docker build -t txthero-backend ./backend
```

Build the frontend image with a custom API URL:

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://api.example.com \
  -t txthero-frontend \
  ./frontend
```

Run the backend image directly:

```bash
docker run -d \
  --name txthero-backend \
  -p 8000:8000 \
  -v txthero-documents:/app/documents \
  txthero-backend
```

Run the frontend image directly:

```bash
docker run -d \
  --name txthero-frontend \
  -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://localhost:8000 \
  txthero-frontend
```

### Data Persistence

Documents saved through the API are stored in a named volume so they survive container restarts and rebuilds.

Inspect the volume:

```bash
docker volume inspect txthero_txthero-documents
```

Back up the volume to a tar archive:

```bash
docker run --rm \
  -v txthero_txthero-documents:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/documents-backup.tar.gz -C /data .
```

Restore from a backup archive:

```bash
docker run --rm \
  -v txthero_txthero-documents:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/documents-backup.tar.gz -C /data
```

Delete the volume permanently:

```bash
docker compose down -v
```

### Environment Variables (Docker)

Override environment variables from the command line or create a `.env` file next to `docker-compose.yml`:

```env
FRONTEND_ORIGIN=https://example.com
NEXT_PUBLIC_API_URL=https://api.example.com
NODE_ENV=production
```

Pass from command line:

```bash
FRONTEND_ORIGIN=https://example.com docker compose up -d
```

**Backend variables:**

| Variable | Default | Description |
| --- | --- | --- |
| `HOST` | `0.0.0.0` | Bind address inside container |
| `PORT` | `8000` | Port inside container |
| `ENV` | `production` | Set to `development` for reload |
| `FRONTEND_ORIGIN` | `http://localhost:3000` | Additional CORS origin |

**Frontend variables:**

| Variable | Default | Description |
| --- | --- | --- |
| `NODE_ENV` | `production` | Next.js environment |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | API base URL used in browser |
| `PORT` | `3000` | Port inside container |

### Docker Networking

Both containers share a private bridge network named `txthero-network`. Inside this network services reach each other by container name:

- Backend from frontend: `http://backend:8000`
- Frontend: `http://frontend:3000`

If the browser needs to reach the backend (e.g., from JavaScript), use the host URL from `NEXT_PUBLIC_API_URL` instead of the container name.

### Health Checks

Both services expose Docker health checks:

- Backend: `GET /health`
- Frontend: HTTP GET on port 3000

Inspect health status:

```bash
docker compose ps
docker inspect --format='{{json .State.Health}}' txthero-backend
```

### Production Deployment

The provided Docker files are production-ready. For a real deployment, consider adding:

- A reverse proxy such as Nginx, Traefik, or Caddy
- TLS certificates via Let's Encrypt
- Container image publishing to a registry
- Managed volumes or an object store for documents

Example Nginx reverse proxy service (excerpt):

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - frontend
      - backend
    networks:
      - txthero-network
```

### Docker Troubleshooting

**A container exits immediately**

Show its logs:

```bash
docker compose logs backend
docker compose logs frontend
```

**Port 3000 or 8000 is already in use**

Change the host-side port in `docker-compose.yml`. For example, to serve frontend on port 4000:

```yaml
    ports:
      - "4000:3000"
```

**Code changes do not appear**

Rebuild the affected image:

```bash
docker compose build backend
docker compose up -d backend
```

Or use the development compose file with mounted source directories.

**Documents missing after `docker compose down`**

Ensure the volume was not removed. Only `docker compose down -v` deletes named volumes.

**Frontend cannot reach backend**

Confirm `NEXT_PUBLIC_API_URL` matches an address reachable from the browser. For local use: `http://localhost:8000`. For deployments: the public API URL through your reverse proxy.

**Remove everything**

Stop and remove all containers, images, volumes, and networks:

```bash
docker compose down -v --rmi all --remove-orphans
```

---

## Desktop Packages

Build platform-specific installers:

```bash
npm run dist:linux
npm run dist:windows
npm run dist:mac
```

Or build all:

```bash
npm run dist:all
```

Generated installers and unpacked applications are written to `release/`. Package names follow this format:

```text
TxtHero-<version>-<operating-system>-<architecture>.<extension>
```

### Building Cross-Platform

For the most reliable results, create packages on the target operating system:

- Build Windows packages on Windows
- Build macOS packages on macOS
- Build Linux packages on Linux

Alternatively, use a CI matrix (GitHub Actions, GitLab CI) with Linux, Windows, and macOS runners.

### Running the Desktop App

The Linux package is self-contained. Electron starts the bundled standalone
Next.js frontend and the PyInstaller-built FastAPI backend, waits for both
health checks, opens the application, and shuts both child processes down when
the final window closes. Users do not install Python, Node.js, or project
dependencies.

Desktop documents, optional collaboration snapshots, uploads, logs, and account metadata
are written under Electron's per-user application-data directory rather than
inside `/opt/TxtHero`.

`TXTHERO_APP_URL` optionally points Electron at an externally hosted frontend.
The bundled backend still starts unless a healthy backend already owns
`127.0.0.1:8000`.

Windows and macOS backend executables must be frozen and tested on their target
operating systems before those installers are released.

### Code Signing and Notarization

Code signing and notarization require platform-specific credentials and are not configured by default. See `electron-builder` documentation for setup.

---

## REST API Reference

The default API origin is `http://127.0.0.1:8000`. Interactive OpenAPI documentation is available at `/docs` while the backend runs.

### General & Health

#### `GET /`

Returns application metadata and an endpoint index.

```bash
curl http://127.0.0.1:8000/
```

#### `GET /health`

Health status endpoint:

```json
{"status":"healthy"}
```

### Solo Document State

#### `GET /content`

Returns the fallback non-collaborative filename and content.

#### `POST /content`

Accepts plain text, HTML strings, or structured JSON. JSON code-block content remains searchable because the search service serializes the current state.

```bash
curl -X POST http://127.0.0.1:8000/content \
  -H 'Content-Type: application/json' \
  -d '{"content":"Hello, world!"}'
```

#### `POST /clear`

Clears fallback content and resets filename to `Untitled`.

### Statistics, Formatting & Search

#### `GET /stats`

Returns document statistics:

```json
{
  "words": 42,
  "characters": 250,
  "characters_no_spaces": 210,
  "lines": 5,
  "paragraphs": 3
}
```

#### `GET /style` & `POST /style`

Reads or partially updates text styling:

```bash
# Read current style
curl http://127.0.0.1:8000/style

# Update style
curl -X POST http://127.0.0.1:8000/style \
  -H 'Content-Type: application/json' \
  -d '{"font_family":"Inter","font_size":18,"bold":false}'
```

Available fields: `font_family`, `font_size`, `bold`, `italic`, `underline`.

#### `POST /search`

Search document content:

```bash
curl -X POST http://127.0.0.1:8000/search \
  -H 'Content-Type: application/json' \
  -d '{"query":"hello"}'
```

Returns one-based line and column positions.

### Local File Management

#### `GET /files`

List saved files and metadata.

#### `POST /files/save`

Save a file:

```bash
curl -X POST http://127.0.0.1:8000/files/save \
  -H 'Content-Type: application/json' \
  -d '{"filename":"notes.txt","content":"Your content here"}'
```

#### `GET /files/load/{filename}`

Load a UTF-8 document by filename.

#### `DELETE /files/{filename}`

Delete a file by filename.

Filenames are reduced to their basename, preventing traversal outside `backend/documents/`.

### Font Catalog

#### `GET /fonts`

Returns all available font categories.

#### `GET /fonts/{category}`

Filter fonts by category: `serif`, `sans-serif`, `monospace`, `display`, or `handwriting`.

#### `GET /fonts/search/{query}`

Perform case-insensitive name search.

Each record includes:
- `name`: Font family name
- `category`: Font classification
- `stack`: Fallback font stack
- `google`: Google Fonts URL (if applicable)
- `import_url`: Optional import stylesheet URL

### Collaboration Diagnostics

Diagnostics are disabled by default. Set `COLLAB_DIAGNOSTICS_TOKEN` and send it as `Authorization: Bearer <token>` to enable these operational endpoints. Normal participants do not need or receive this token.

#### `GET /collab/rooms`

Returns room counts, user counts, and metadata for all active collaboration rooms to an authorized operator.

#### `GET /collab/rooms/{document_id}`

Returns metadata for a single room or 404 if not found. Exposes presence only—not document content or Yjs state.

#### `GET /collaboration/{document_id}/users`

Preserves the original active-user response shape. It requires a valid participant credential for that session.

---

## WebSocket Collaboration

### Overview

TxtHero Live is an optional, document-scoped CRDT editor at `/collab`. The original `/` editor remains independent. A host creates an ephemeral session and shares its 6-digit discovery code or QR link. The code is never an access credential: every approved participant receives a separate random token scoped to that session.

The collaborative mode uses Yjs (a CRDT library) to achieve:
- Conflict-free concurrent editing
- Automatic synchronization without last-write-wins
- Ephemeral document contents by default; optional snapshots only when explicitly enabled
- Real-time presence (cursor positions, user names, colors)
- Typing activity and editor/viewer roles
- Reconnection support with exponential backoff

### Architecture

```text
 Host / Editor                     FastAPI :8000              Guest / Viewer
 ┌─────────────────────┐     binary WS      ┌──────────────────────────────┐      ┌─────────────────────┐
 │ TipTap / ProseMirror│◄──────────────────►│ /ws/{document_id}            │◄────►│ TipTap / ProseMirror│
 │ CollaborationCaret  │                    │ ConnectionManager            │      │ CollaborationCaret  │
 │ scoped bearer token │                    │ session authorization        │      │ scoped bearer token │
 │ Y.Doc + awareness   │                    │ YRoom + server-side Y.Doc    │      │ Y.Doc + awareness   │
 └─────────────────────┘                    └──────────────┬───────────────┘      └─────────────────────┘
                                                         │ optional snapshots only when
                                                         ▼ COLLAB_PERSIST_UPDATES=true
```

TipTap stores its ProseMirror document in a Yjs XML fragment. Local transactions produce compact binary Yjs updates. `y-websocket` exchanges state vectors and only the missing updates with the FastAPI room. Updates are commutative and idempotent, so simultaneous edits converge without data loss. The separate Yjs awareness channel carries guest identity, caret, and selection; awareness is intentionally not persisted.

### WebSocket Endpoint

#### `WebSocket /ws/{session_code}?token=<participant-token>`

This endpoint speaks the binary y-websocket sync and awareness protocol. Connect through `WebsocketProvider`; a raw JSON WebSocket client is not compatible.

```javascript
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

const doc = new Y.Doc()
const provider = new WebsocketProvider(
  'ws://127.0.0.1:8000/ws',
  '482913',
  doc,
  { params: { token: participantToken } }
)
```

**Session code constraints:**

- Exactly six numeric digits
- Cryptographically generated with collision checks among active sessions
- Valid only until the session expires or the host ends it
- Never sufficient without a scoped participant token
- Invalid or revoked credentials close the socket with policy code `1008`

Viewers may receive Yjs synchronization and awareness frames, but document-update frames from viewers are discarded at the WebSocket boundary. Hiding the toolbar is only a secondary UI safeguard.

### Session Lifecycle API

| Endpoint | Purpose |
| --- | --- |
| `POST /collab/sessions` | Create a session and issue the host credential |
| `POST /collab/sessions/{code}/join` | Submit a guest request or join immediately when approval is disabled |
| `GET /collab/join-requests/{request_id}` | Poll a high-entropy pending request for approval/rejection |
| `GET /collab/sessions/{code}` | Read authorized session and participant state |
| `POST /collab/sessions/{code}/requests/{request_id}/{approve|reject}` | Host approval decision |
| `PATCH /collab/sessions/{code}/participants/{participant_id}` | Change editor/viewer role |
| `DELETE /collab/sessions/{code}/participants/{participant_id}` | Remove a participant and revoke access |
| `DELETE /collab/sessions/{code}` | End the session |

Authorized HTTP calls use `Authorization: Bearer <participant-token>`. The join endpoint is limited to five attempts per client address per minute. A session supports 2–15 participants; team sessions default to 10.

### Guest Identity & Presence

On first use, the frontend creates a random UUID, display name, and palette color in localStorage under `txthero-guest`. Presence, remote selections, labeled carets, and typing activity are distributed through Yjs Awareness and are not persisted. The presence endpoint requires a valid session credential:

```http
GET /collaboration/{document_id}/users
```

The `/collab/rooms` diagnostic endpoints are disabled unless `COLLAB_DIAGNOSTICS_TOKEN` is configured, then require that token as a bearer credential.

### Testing Collaboration with Multiple Users

1. Open `http://localhost:3000/collab` in two browsers or one normal and one private window.

2. In the first profile, create a session and leave **Require host approval** enabled. In the second, enter the displayed 6-digit code.

3. Approve the pending guest. Confirm the second profile connects and both users appear in the participant sidebar.

4. Type simultaneously near the same paragraph. Both windows should converge and show colored selections/carets and typing state.

5. Change the guest to **Viewer** and verify their formatting toolbar disappears and their update frames are rejected. Restore **Editor**, then remove the guest and confirm their credential no longer works.

6. End the session and verify both clients return to the lobby. By default, creating a new session starts with an empty ephemeral document.

### Reconnection Testing

In browser DevTools:

1. Open Network and select the `/ws/<six-digit-code>` request
2. Switch Network throttling preset to Offline
3. The indicator changes to Disconnected/Reconnecting
4. Continue editing locally; changes queue
5. Restore networking to reconnect and converge

Alternatively, stop and restart the backend. `y-websocket` uses exponential backoff automatically.

### Inspecting WebSocket Traffic

In Chromium DevTools:

1. Open **Network → WS**
2. Choose the `/ws/<room>` connection
3. Open **Messages** tab

Frames are binary (Yjs sync or awareness protocol). Initial exchange is sync step 1/2; later frames are incremental updates and cursor awareness.

### Room Lifecycle

```text
create session    → issue code + host credential → bind one logical document
join request      → pending approval → issue participant-scoped credential
first connection → authorize token → start ephemeral YRoom
connection       → sync state vector → exchange missing updates
viewer update    → reject at WebSocket adapter
remove/end/expiry→ revoke authorization and disconnect through client polling
```

Set `COLLAB_PERSIST_UPDATES=true` only when restart recovery is explicitly required. When enabled, atomic Yjs snapshots use the existing `.collaboration` directory. Awareness, cursor, and typing state remain ephemeral.

### Scaling Notes

- Sessions, credentials, throttling counters, and rooms are process-local
- Use one Uvicorn worker for this design
- Horizontal scaling requires a TTL session store, shared rate limiter, sticky routing, and shared Yjs pub/sub

### Migrating from Solo to Collaborative

The current textarea stores plain text through REST. TipTap collaboration stores rich-text CRDT state, so the two formats are intentionally isolated.

To import an existing REST document:
1. Load its text once
2. Insert it into TipTap only when the Yjs document is empty
3. Do not repeat the import on reconnect (duplicate content risk)

```javascript
// Example import logic
if (yDoc.isEmpty()) {
  const content = await fetchRESTContent()
  yXmlFragment.insert(0, [new Y.XmlText(content)])
}
```

### Privacy Boundary

- Only the current collaborative Yjs document is shared.
- Session payloads contain opaque IDs, display metadata, roles, and expiration—not filesystem paths.
- Guests receive no directory listing, file handle, upload endpoint, shell, or arbitrary read/write API.
- The relay is currently a trusted TLS endpoint; payloads are not end-to-end encrypted from the relay.
- Filesystem/project sharing, camera QR scanning, durable Alt+Hover attribution, and E2E encryption remain separate future phases.

---

## Code Blocks & Shortcuts

TxtHero Live uses TipTap's collaborative ProseMirror document and `CodeBlockLowlight` for syntax highlighting. A code block is a normal CRDT node, so its text and language attribute merge through Yjs just like paragraphs.

### Creating & Editing Code Blocks

- Click the **code block** toolbar button
- Press `Ctrl+Shift+C` on Windows/Linux or `Cmd+Shift+C` on macOS
- Type three backticks followed by Space at the start of an empty paragraph
- Press Tab inside a code block to insert two spaces instead of moving browser focus
- Use the menu in the block header to change language
- Use **Copy** to copy only code text

Line numbers are presentation-only and never become part of copied or persisted code. Highlighting is also presentation-only; Yjs stores source text and the selected language.

### Supported Languages

Plain text, Python, JavaScript, TypeScript, HTML/XML, CSS, JSON, Bash/Shell, SQL, Rust, Go, Java, C, C++, C#, Ruby, PHP, Swift, Kotlin, Markdown, YAML, TOML, Dockerfile, and Makefile.

Only these grammars are imported in `frontend/src/lib/lowlight.js`, keeping the bundle smaller than importing all Highlight.js languages. The dark token theme and line-number layout live in `frontend/src/styles/code-block.css`.

### Testing Code Blocks

1. Create a Live session and join it from a second browser profile
2. Insert a Python block and paste `print("hello")`
3. Confirm both windows show the same block and highlighting
4. Change the language in one window and confirm it changes in the other
5. Put both carets on the same line and type simultaneously; both edits must remain
6. Confirm the block remains synchronized while the session is active

---

## Font Library

TxtHero exposes more than 70 fonts from `GET /fonts`. System fonts render immediately. Google Fonts are fetched only when selected, so the initial page does not download the whole catalog. The chosen record is remembered in localStorage as `txthero-font`.

### Available Fonts by Category

**Sans-serif:**
Arial, Helvetica, Segoe UI, Roboto, Open Sans, Lato, Montserrat, Raleway, Nunito, Poppins, Inter, Source Sans 3, Work Sans, Outfit, DM Sans, Plus Jakarta Sans, Manrope, Urbanist, Quicksand, Comfortaa, Rubik, Karla, Josefin Sans, Mukta, Figtree.

**Serif:**
Times New Roman, Georgia, Garamond, Palatino, Book Antiqua, Libre Baskerville, Lora, Merriweather, Playfair Display, EB Garamond, Crimson Text, Cormorant Garamond, Source Serif 4, Bitter, Spectral, PT Serif, Noto Serif, DM Serif Display.

**Monospace:**
Courier New, Consolas, Cascadia Code, Fira Code, JetBrains Mono, Source Code Pro, Ubuntu Mono, IBM Plex Mono, Inconsolata, Anonymous Pro, Space Mono, Roboto Mono, Red Hat Mono, Overpass Mono, DM Mono.

**Display:**
Impact, Comic Sans MS, Lobster, Righteous, Bebas Neue, Oswald.

**Handwriting:**
Permanent Marker, Pacifico, Satisfy, Dancing Script, Caveat, Indie Flower, Architects Daughter, Sacramento, Great Vibes.

### Font Loading

System fonts render immediately. Google Fonts are fetched lazily only when selected:

1. Open DevTools → Network and filter for `fonts.googleapis.com`
2. Reload. No catalog-wide request should occur
3. Select Lora. One Lora stylesheet request should appear
4. Reload again. Lora remains selected through localStorage
5. Stop the backend and verify the selector falls back to Arial rather than breaking the editor

---

## Universal Formatter

TxtHero includes a universal formatter workspace for editing, formatting, and converting multiple file types.

### Supported Formats & Capabilities

| Formats | Parser/renderer | Editor | Export |
|---|---|---|---|
| JS/JSX/TS/TSX/JSON/CSS/SCSS/Less/HTML/Vue/Angular/Markdown/MDX/YAML/GraphQL | Prettier standalone + Babel, Estree, TypeScript, PostCSS, HTML, Markdown, YAML, GraphQL plugins | Monaco split source/preview | UTF-8 original extension |
| XLSX | ExcelJS workbook reader | Editable worksheet grid | ExcelJS XLSX writer; formulas beginning `=` remain formulas |
| DOCX | Mammoth text extraction | Document text editor | `docx` regenerated paragraphs |
| PPTX | Retained original + editable slide model | Slide cards | PptxGenJS rebuilt slides |
| PDF | Retained original + editable replacement text | Document editor | pdf-lib regenerated accessible text PDF |
| Unknown binary | Magic-byte upload pipeline | Read-only | Byte-identical original |

The original browser `File`/bytes are retained in memory while editing. XLSX
cells are patched into the original workbook. DOCX and PPTX text nodes are
patched into their original OOXML ZIP packages so untouched media, themes,
relationships, charts, and metadata remain. Original PDF pages are preserved
and edited accessible text is appended because arbitrary PDF drawing commands
cannot be losslessly reconstructed. Unsupported binary files are read-only and
download byte-identically. See `FORMATTER.md` for the exact capability matrix.

### Formatter Dependencies

`prettier`, `@monaco-editor/react`, `monaco-editor`, `exceljs`, `mammoth`, `docx`, `pptxgenjs`, `pdf-lib`, `pdfjs-dist`, `react-dropzone`, `react-hot-toast`, and `lucide-react`.

### Formatter Shortcuts

- `Ctrl/Cmd+S`: format the current source file
- `Ctrl/Cmd+D`: download the formatted or regenerated document
- Drag up to 50 MB per file into the upload zone

The browser formatter does not upload local files. The authenticated `/api/files` endpoint is separate private storage for files users explicitly choose to persist.

---

## Architecture & Design

### Component Overview

```text
┌──────────────── Browser / Electron renderer ────────────────┐
│ TipTap ⇄ ProseMirror ⇄ Y.Doc                                │
│ Toolbar / CodeBlock / FontSelector / Presence               │
│            │ REST (JSON)             │ WS (binary Yjs)      │
└────────────┼─────────────────────────┼───────────────────────┘
             ▼                         ▼
┌────────────────────── FastAPI :8000 ────────────────────────┐
│ Existing REST routers       Collaboration router            │
│ file/search/stats/fonts     ConnectionManager → YRoom       │
│             │                         │                     │
└─────────────┼─────────────────────────┼─────────────────────┘
              ▼                         ▼
 backend/documents/*        ephemeral YRoom by default
                            optional .collaboration/<code>.yjs
```

### Yjs Update Flow

```text
User A types → ProseMirror transaction → Yjs binary update
     → y-websocket frame → FastAPI adapter → server Y.Doc
     → broadcast frame → User B Y.Doc → ProseMirror renders
```

Yjs updates are commutative and idempotent. If A and B insert at the same position offline, each insertion has a CRDT identity. After reconnection both replicas apply both updates and deterministically reach the same ordering; neither user's text is overwritten.

Awareness uses a separate ephemeral protocol carrying `{user, cursor, selection}`. It is broadcast but not written to disk. The server-side room awareness powers REST presence diagnostics.

### REST Lifecycle

```text
request → Uvicorn → FastAPI router → Pydantic validation
        → service/state → JSON response or typed HTTP error
```

### Docker Network Topology

```text
Host :3000 → frontend container
Host :8000 → backend container (HTTP and WebSocket on one port)
frontend build-time public URLs → browser → Host :8000
backend container → named volume /app/documents
```

WebSockets use HTTP Upgrade on the same port; Compose itself needs no special upgrade headers. A reverse proxy must forward `Upgrade` and `Connection` headers and disable response buffering for `/ws/`.

### Technology Stack

- **Frontend**: Next.js and React for the user interface
- **Rich text editing**: TipTap and ProseMirror
- **Real-time sync**: Yjs with y-websocket protocol
- **Backend API**: FastAPI with async/await
- **Persistence**: Python file I/O with atomic snapshots
- **Desktop**: Electron with Electron Builder
- **Containerization**: Docker and Docker Compose
- **Formatting**: Prettier, ExcelJS, Mammoth, pdf-lib, PptxGenJS
- **Authentication**: Clerk

---

## Security

### Authentication

TxtHero uses Clerk as the authentication authority. The application never receives email/password signup or login payloads, never compares passwords, and never stores credentials.

Clerk owns:
- Email normalization
- Password bounds/policies
- Password hashing
- Constant-time verification
- Brute-force controls
- Email verification
- OAuth
- Password reset
- Session management

TxtHero validates inputs it owns:

- **Contact form**: Zod validation, normalized email, maximum lengths, generic failures, rejection security log
- **Upload**: authenticated user, 50 MB maximum, basename/path rejection, actual magic-byte allowlist, private mode `0600` storage
- **Live collaboration**: six-digit discovery-code validation, independent participant credentials, host authorization, role enforcement, revocation, expiration, and join throttling

Protected routes are declared in `frontend/proxy.js`. The webhook uses Clerk `verifyWebhook()` before writes. Local user metadata contains only `clerkUserId`, plan, preferences, timestamps, and a deletion marker.

### Clerk Configuration Checklist

1. Create a Clerk application and copy publishable/secret keys
2. Enable email/password and require email verification
3. Under Social Connections, enable Google and GitHub with their OAuth credentials
4. Create a webhook endpoint `https://YOUR_DOMAIN/api/webhooks/clerk`
5. Subscribe to `user.created` and `user.deleted`; copy the signing secret
6. Configure allowed origins and production redirect URLs
7. Review Clerk attack protection/password policy settings; test with your selected plan

### Error Messages

Generic application responses use:
- `Unauthorized`
- `Invalid request`
- `Invalid submission`
- `Unsupported upload`
- Empty 404

Clerk controls externally visible credential errors.

### Secret Scan

Verify no secrets are committed:

```bash
git log --all --full-history -- "*.env"
git grep -I -n -E '(sk_live|pk_live|ghp_|AKIA|BEGIN PRIVATE KEY)' $(git rev-list --all)
```

If a secret was ever committed, rotate it immediately, then use:

```bash
git filter-repo --path .env --path frontend/.env.local --invert-paths
git push --force --all
git push --force --tags
```

All collaborators must re-clone after rewritten history.

### Upload Security

Files are stored under `frontend/storage/uploads/<clerk-user-id>/`, outside `public/`, with directory mode `0700` and file mode `0600`.

Downloads:
- Require the same authenticated Clerk user
- Use attachment disposition
- Private/no-store caching
- `X-Content-Type-Options: nosniff` header
- HTML is never served as `text/html`

The local filesystem backend is suitable for one server. Production multi-instance deployment should:
- Replace with a private S3-compatible bucket
- Block public access
- Enable server-side encryption
- Implement malware scanning/quarantine
- Use short-lived signed downloads

---

## Dependency Audit

**Audit date:** July 22, 2026

Initial audit found six vulnerabilities. The no-fix vulnerable `xlsx` package was removed and replaced with ExcelJS. Safe updates upgraded Next.js from 16.2.10 to 16.2.11 and updated transitive packages. DOMPurify and UUID were pinned to patched versions through npm overrides.

### Vulnerability Summary

```text
Package: xlsx
Severity: HIGH
Issue: Prototype pollution and ReDoS
Current: removed
Safe fix: no npm registry fix
Action: replaced with ExcelJS

Package: dompurify (via Monaco)
Severity: MODERATE
Issue: sanitizer configuration pollution/bypass advisories
Current: patched override >=3.4.12
Action: updated

Package: uuid (via ExcelJS)
Severity: MODERATE
Issue: buffer bounds check in legacy versions
Current: patched override >=11.1.1
Action: updated

Package: postcss (nested under Next)
Severity: MODERATE
Issue: unescaped closing style tag
Current: nested version selected by Next 16.2.11
Safe fix: npm incorrectly proposes Next 9.3.3
Action: do not force downgrade; user source is never interpolated into generated CSS

Package: sharp/libvips (optional Next dependency)
Severity: HIGH
Issue: inherited 2026 libvips advisories
Current: below advisory-safe 0.35 according to npm
Safe fix: npm incorrectly proposes Next 9.3.3
Action: no user image optimization route is used; track the next stable Next release
```

### Audit Recommendations

**Never run `npm audit fix --force` here:** npm proposes a destructive Next 9 downgrade.

Regular audits:

```bash
npm audit --json
```

Review remaining Next.js advisories and track upstream fixes.

---

## Environment Variables

### Master List

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Public | Browser-visible FastAPI origin |
| `NEXT_PUBLIC_WS_URL` | Public | Browser-visible Yjs WebSocket origin |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Public | Clerk frontend identifier (designed to be public) |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Public | Clerk sign-in route |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Public | Clerk sign-up route |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | Public | Post-login route |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | Public | Post-signup route |
| `CLERK_SECRET_KEY` | Server only | Clerk server authentication |
| `CLERK_WEBHOOK_SECRET` | Server only | Svix webhook signature verification |
| `SUPPORT_EMAIL` | Server only | Contact destination/privacy contact |
| `SUPPORT_FROM_EMAIL` | Server only | Contact email sender |
| `SMTP_URL` | Server only | SMTP credentials/connection URL |
| `GOOGLE_SITE_VERIFICATION` | Server-rendered metadata | Search Console token (exposed in metadata by design) |
| `TXTHERO_APP_URL` | Electron main process | Hosted application origin |
| `HOST` | FastAPI server | Bind address (default `127.0.0.1`) |
| `PORT` | FastAPI server | API port (default `8000`) |
| `ENV` | FastAPI server | Set to `development` for reload; default `production` |
| `FRONTEND_ORIGIN` | FastAPI server | Additional browser origin allowed by CORS |
| `CORS_ORIGINS` | FastAPI server | Comma-separated allowed origins |
| `WEBSOCKET_URL` | Deployment | Internal/documentation WebSocket origin |

### Important Notes

- Only variables beginning `NEXT_PUBLIC_` enter browser bundles
- `next.config.mjs` does not copy server secrets into `env` or public runtime configuration
- Set `NEXT_PUBLIC_*` variables before running `npm run build` or `docker compose up`
- For local development, `.env.example` provides a template

---

## Troubleshooting

### Common Development Issues

**Backend executable missing**

Create `backend/.venv` and install requirements:

```bash
python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements.txt
```

**Editor says "reconnecting"**

Check:
1. `/health` endpoint responds
2. `NEXT_PUBLIC_WS_URL` is correct and accessible
3. Firewall rules allow WebSocket traffic
4. Reverse proxy forwards `Upgrade` and `Connection` headers
5. Proxy does not buffer WebSocket responses

**Mixed-content failure**

An HTTPS page must use `wss://`, not `ws://`:

```bash
export NEXT_PUBLIC_WS_URL=wss://your-domain.com
npm run build
```

**A Live document does not load after restart**

This is the default privacy behavior: Live contents are scoped to the active server session. If restart recovery is an explicit product requirement, set `COLLAB_PERSIST_UPDATES=true`, ensure `TXTHERO_STORAGE_DIR` is writable and persistent, and disclose the retention behavior to users.

**Google Font unavailable**

Corporate filtering may block googleapis.com. The CSS fallback stack (sans-serif, serif, monospace) still renders.

**Two tabs show the same name**

Identity intentionally belongs to the browser profile. Use a private window to simulate another guest.

**Electron does not open**

Confirm that ports 3210 and 8000 are available:

```bash
lsof -i :3210
lsof -i :8000
```

**Desktop application cannot load or save documents**

The installed Linux app starts its backend automatically. Inspect
`backend.log` under TxtHero's user-data `logs` directory and confirm
`http://127.0.0.1:8000/health` responds. A separately running service on port
8000 must either be a healthy TxtHero backend or be stopped.

**Cross-platform package fails**

Build on the target operating system or use CI with Linux, Windows, and macOS runners. Code signing and notarization require platform-specific credentials.

**Port 3000 or 8000 is already in use**

Change the port in `docker-compose.yml` or use a different port:

```bash
PORT=9000 npm run backend
```

**Changes to code do not appear**

Rebuild the affected service:

```bash
docker compose build backend
docker compose up -d backend
```

Or use the development compose file with hot-reload enabled.

**Documents are missing after `docker compose down`**

Only `docker compose down -v` deletes named volumes. Check if the volume still exists:

```bash
docker volume ls | grep txthero
```

---

## Launch Checklist

Complete these items before production launch:

### Product

- [ ] Test JS, TS, CSS, HTML, Markdown, JSON, YAML, and GraphQL formatting
- [ ] Test XLSX formulas and representative DOCX/PPTX/PDF files
- [ ] Confirm fidelity warnings are acceptable for office/PDF documents
- [ ] Test downloads in Chrome, Firefox, Safari, Edge, and Electron
- [ ] Test mobile/tablet layout and both light/dark themes
- [ ] Test two-user Yjs collaboration, approval, roles, removal, termination, and reconnection end-to-end
- [ ] Confirm documents are ephemeral after restart by default
- [ ] If persistence is enabled, confirm restart recovery and retention disclosure

### Clerk Authentication

- [ ] Production Clerk keys configured in `.env`
- [ ] Email verification required in Clerk dashboard
- [ ] Email/password sign-in tested
- [ ] Email reset flow tested
- [ ] Google OAuth enabled and tested
- [ ] GitHub OAuth enabled and tested
- [ ] Webhook signature secret configured and verified
- [ ] `user.created` webhook creates local metadata
- [ ] `user.deleted` webhook anonymizes local metadata
- [ ] Clerk attack protection tested with non-production account

### Security

- [ ] Replace local file/user JSON stores with transactional database
- [ ] Replace local file storage with private S3-compatible bucket
- [ ] Enable malware scanning/quarantine before uploads are available
- [ ] Run `npm audit --json`; review and resolve remaining advisories
- [ ] Run source code secret scan:
  ```bash
  git log --all --full-history -- "*.env"
  git grep -I -n -E '(sk_live|pk_live|ghp_|AKIA|BEGIN PRIVATE KEY)' $(git rev-list --all)
  ```
- [ ] Rotate any exposed secrets
- [ ] Verify storage directory modes and S3 bucket public-access block
- [ ] Verify HTTPS, HSTS headers, CSP policy
- [ ] Verify WebSocket proxy forwards `Upgrade` and `Connection` headers
- [ ] Verify upload size limits at edge/reverse proxy

### Legal & Operations

- [ ] Have counsel replace governing-law/company placeholders
- [ ] Set `SUPPORT_EMAIL` and privacy contact information
- [ ] Configure `SMTP_URL` and `SUPPORT_FROM_EMAIL`
- [ ] Replace `example.com` in sitemap and robots.txt
- [ ] Set Google Search Console verification token
- [ ] Confirm user retention/deletion policies
- [ ] Implement privacy data export workflow
- [ ] Configure automated backups
- [ ] Set up monitoring, alerting, and incident response
- [ ] Configure status page
- [ ] Confirm Clerk, storage provider, and email service DPAs
- [ ] Verify all subprocessors are documented

---

## Implementation Changelog

### Created Files

- `frontend/app/format/page.js` and `src/components/formatter/*`: universal formatter workspace and type-specific editors
- `frontend/src/lib/formatterRegistry.js`, `prettierFormatter.js`, `documentPipeline.js`: capability registry and parse/format/export pipelines
- `frontend/proxy.js`, Clerk sign-in/sign-up/dashboard pages, `AuthProvider.jsx`: hosted Clerk authentication
- `frontend/app/api/webhooks/clerk/route.js` and `userStore.js`: verified Clerk metadata synchronization
- `frontend/app/api/files/*`, `fileSecurity.js`: authenticated private magic-byte upload/download path
- `frontend/app/api/contact/route.js`, contact page, and `securityLog.js`: validated support workflow
- Privacy, terms, cookies, consent, footer, robots, and sitemap files: launch/legal/SEO baseline
- Documentation files: `FORMATTER.md`, `SECURITY.md`, `DEPENDENCY_AUDIT.md`, `ENVIRONMENT.md`, `LAUNCH_CHECKLIST.md`

### Modified Files

- `frontend/package.json` and lockfile: formatter, Office/PDF, Clerk, validation, storage, and mail dependencies; patched transitive overrides
- `frontend/next.config.mjs`: switched from static export to hosted standalone server
- `frontend/app/layout.js` and `globals.css`: provider, metadata, consent/footer, formatter/legal design system
- `frontend/Dockerfile` and Compose files: standalone server and Clerk/server environment wiring
- `electron/main.js` and root packaging config: Electron loads the hosted authenticated app
- `.env.example` and `.gitignore`: complete variable names and private storage exclusion

### Removed Files

- `frontend/middleware.js`: replaced by current Next 16 `proxy.js` convention
- `xlsx` dependency: removed due to high-severity, no-fix npm advisories; replaced with ExcelJS
- Static-export packaging of `frontend/out`: incompatible with Clerk middleware and server routes

### Note

No custom auth/password/JWT/session files existed, so none were deleted or migrated.

---

## Data Storage

During source development, the API stores local documents under
`backend/documents/`. The installed desktop app stores them in Electron's
per-user application-data directory. Treat either location as user data and
back it up before removal.

In Docker, documents are persisted in the named volume `txthero_txthero-documents`. Inspect with:

```bash
docker volume inspect txthero_txthero-documents
```

Live CRDT content is memory-only by default. When `COLLAB_PERSIST_UPDATES=true`, snapshots are stored under `TXTHERO_STORAGE_DIR/.collaboration/` as `.yjs` binary files. Session credentials and awareness state are never written to those snapshots.

---

## Support & Contribution

For issues, questions, or contributions:

1. Check this documentation and the troubleshooting section
2. Review recent GitHub issues and discussions
3. Open a new issue with detailed reproduction steps, environment details, and logs
4. For security concerns, contact the maintainers privately

---

## License & Credits

TxtHero is built with:
- [Next.js](https://nextjs.org/) and [React](https://reactjs.org/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [Yjs](https://docs.yjs.dev/) and [y-websocket](https://github.com/yjs/y-websocket)
- [TipTap](https://www.tiptap.dev/) and [ProseMirror](https://prosemirror.net/)
- [Electron](https://www.electronjs.org/) and [Electron Builder](https://www.electron.build/)
- [Clerk](https://clerk.com/) for authentication
- [Prettier](https://prettier.io/), [ExcelJS](https://exceljs.readthedocs.io/), [pdf-lib](https://pdf-lib.js.org/), and other formatting libraries

See `package.json` and `backend/requirements.txt` for the full dependency list.

---

**Last Updated:** July 23, 2026
**Version:** 1.0
**Repository:** https://github.com/nilaymathur20/TxtHero.git
