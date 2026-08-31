# TxtHero

A fast, keyboard-first text editor that runs entirely in your browser. Nothing is
uploaded anywhere — with the File System Access API it reads and writes your files
on disk directly; without it, it falls back to the classic open/download flow.

Built with React 18, TypeScript and Vite. The text surface is
[CodeMirror 6](https://codemirror.net/).

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
```

Other scripts:

| Command             | What it does                                        |
| ------------------- | --------------------------------------------------- |
| `npm run dev`       | Dev server with HMR, bound to `0.0.0.0`             |
| `npm run build`     | Typecheck, then produce an optimised `dist/`        |
| `npm run preview`   | Serve the production build                          |
| `npm run typecheck` | `tsc -b` across the app and the Vite config          |
| `npm test`          | Run the Vitest suite once                            |
| `npm run test:watch`| Vitest in watch mode                                 |

## What it does

**Editing** — syntax highlighting for JS/TS/JSX/TSX, JSON, Markdown, Python, HTML,
CSS, XML and YAML (grammars are lazily imported, so you only pay for what you
open). Code folding, bracket matching, autocomplete, multiple cursors, and
find-and-replace via `Ctrl/Cmd+F`.

**Files** — open one or many files, or a whole folder for a tree explorer and
fuzzy Quick Open. Save writes straight back through the file handle. Tabs show a
dot when they hold unsaved changes, and closing one asks first.

**Session** — open tabs and their contents are restored on reload as unsaved
drafts. File handles cannot survive a reload, so reopening the folder re-links
them by path.

**View** — dark and light themes, adjustable font size, word wrap, whitespace
rendering, indent width, and a split Markdown preview.

## Keyboard

| Shortcut                   | Action              |
| -------------------------- | ------------------- |
| `Ctrl/Cmd + N`             | New file            |
| `Ctrl/Cmd + O`             | Open file           |
| `Ctrl/Cmd + Shift + O`     | Open folder         |
| `Ctrl/Cmd + S`             | Save                |
| `Ctrl/Cmd + Shift + S`     | Save as             |
| `Ctrl/Cmd + P`             | Quick open          |
| `Ctrl/Cmd + K`             | Command palette     |
| `Ctrl/Cmd + F`             | Find and replace    |
| `Ctrl/Cmd + B`             | Toggle explorer     |
| `Ctrl/Cmd + Shift + V`     | Markdown preview    |
| `Ctrl/Cmd + =` / `-` / `0` | Bigger / smaller / reset font |

Double-click a tab to rename it. Middle-click to close it.

## Layout

```
src/
  editor/
    setup.ts        CodeMirror instance: compartments, theming, doc swapping
    status.ts       Cursor/document stats, kept outside React state
  lib/
    files.ts        File System Access API + upload/download fallbacks
    languages.ts    Extension -> grammar, loaded on demand
    format.ts       Word/line/byte counting, fuzzy matching
    persist.ts      Session save/restore
    store.ts        Tiny observable cell used with useSyncExternalStore
  state/
    reducer.ts      Pure tab/settings state machine
    EditorContext.tsx  File IO and the actions the UI calls
  components/       Title bar, tabs, explorer, status bar, palette, welcome
```

## Design notes

**Caret movement never touches React state.** Line, column, selection size and
word count live in an observable cell (`editor/store.ts`) read only by the status
bar, and each tab's caret/scroll position is cached in a ref. Only real text
edits go through the reducer, so typing in a large file re-renders one small
component instead of the whole shell.

**Settings survive tab switches.** Swapping documents means building a fresh
`EditorState`, which would otherwise resurrect the initial values baked into the
extension list. `setup.ts` mirrors the live configuration and rebuilds from it,
so theme, font size, wrap, gutter, indent and language mode all persist.

**Markdown preview is unsanitised.** `marked` does not escape HTML. That is
acceptable while TxtHero only renders text the user opened themselves, in their
own browser; a share or collaborate feature would need a sanitiser in front of it.

## Browser support

Full direct-disk read/write needs the File System Access API (Chromium-based
browsers). Firefox and Safari still work — opening uses a file picker and saving
downloads a copy — but folder browsing is unavailable.

## Tests

`npm test` runs 99 tests across seven files. Beyond unit coverage of the reducer,
language detection, fuzzy ranking, session persistence and the observable store,
`src/editor/setup.test.ts` drives a real CodeMirror instance in jsdom to assert
document loading, computed status, live reconfiguration and per-instance
isolation, and `src/App.test.tsx` mounts the full `<App />` to exercise the
shell, shortcuts and command palette end to end.

## License

MIT — see [LICENSE](./LICENSE).
