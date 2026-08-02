# Environment Variables

| Variable | Exposure | Consumer | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Public | Browser | FastAPI HTTP origin |
| `NEXT_PUBLIC_WS_URL` | Public | Browser | Collaboration WebSocket origin |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Public by design | Browser/Clerk | Clerk application identifier |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Public | Browser | Sign-in route |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Public | Browser | Sign-up route |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | Public | Browser | Post-sign-in route |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | Public | Browser | Post-sign-up route |
| `CLERK_SECRET_KEY` | Server only | Next server | Clerk server API |
| `CLERK_WEBHOOK_SECRET` | Server only | Webhook route | Svix signature verification |
| `SUPPORT_EMAIL` | Server only | Contact route/legal page SSR | Contact destination |
| `SUPPORT_FROM_EMAIL` | Server only | Contact route | Mail sender |
| `SMTP_URL` | Server only | Contact route | SMTP credentials |
| `GOOGLE_SITE_VERIFICATION` | Public metadata | Next metadata | Search Console verification |
| `SITE_URL` | Public metadata | Sitemap/robots | Canonical deployment origin |
| `TXTHERO_UPLOAD_DIR` | Server only | Next server/Electron | Private upload root |
| `TXTHERO_USER_DATA_DIR` | Server only | Next server/Electron | Clerk metadata root |
| `TXTHERO_STORAGE_DIR` | Server only | FastAPI/Electron | Local documents and optional CRDT snapshots |
| `COLLAB_PERSIST_UPDATES` | Server only | FastAPI | Set to `true` to opt into Yjs disk snapshots; defaults to `false` |
| `COLLAB_DIAGNOSTICS_TOKEN` | Server only | FastAPI | Enables and protects room diagnostic endpoints |
| `TXTHERO_APP_URL` | Desktop process | Electron | Optional externally hosted frontend |
| `HOST` | Server only | FastAPI/Next | Bind host |
| `PORT` | Server only | FastAPI/Next | Bind port |
| `ENV` | Server only | FastAPI | Runtime environment |
| `FRONTEND_ORIGIN` | Server only | FastAPI | Primary CORS origin |
| `CORS_ORIGINS` | Server only | FastAPI | Comma-separated CORS origins |
| `WEBSOCKET_URL` | Deployment | Documentation/deployment | WebSocket address |

Only `NEXT_PUBLIC_*` values enter browser JavaScript. `next.config.mjs` does not copy server variables into a public `env` object.
