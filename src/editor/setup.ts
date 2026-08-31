import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import {
  bracketMatching,
  defaultHighlightStyle,
  foldGutter,
  foldKeymap,
  indentOnInput,
  indentUnit,
  syntaxHighlighting,
} from '@codemirror/language'
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search'
import { Compartment, EditorState, type Extension } from '@codemirror/state'
import {
  crosshairCursor,
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  highlightWhitespace,
  keymap,
  lineNumbers,
  rectangularSelection,
} from '@codemirror/view'
import { oneDark } from '@codemirror/theme-one-dark'
import { countWords } from '../lib/format'
import type { EditorStatus } from './status'
import type { ThemeName } from '../state/types'

export interface UpdatePayload {
  docChanged: boolean
  doc: string
  anchor: number
  head: number
  scroll: number
  status: EditorStatus
}

export interface EditorHost {
  view: EditorView
  /** Swap the whole document, preserving caret + scroll. Used on tab switch. */
  load(doc: string, anchor: number, head: number, scroll: number): void
  reconfigure: {
    language(extension: Extension[]): void
    theme(name: ThemeName): void
    wrap(enabled: boolean): void
    font(size: number): void
    gutter(enabled: boolean): void
    indent(size: number): void
    whitespace(enabled: boolean): void
  }
  destroy(): void
}

export interface CreateEditorOptions {
  onUpdate(payload: UpdatePayload): void
}

function chromeTheme(name: ThemeName): Extension {
  // Colours come from CSS custom properties, so the editor follows the app
  // theme via CSS while `dark` still tells CodeMirror which scheme it's in.
  return EditorView.theme(
    {
      '&': {
        height: '100%',
        backgroundColor: 'transparent',
        color: 'var(--fg)',
      },
      '&.cm-focused': { outline: 'none' },
      '.cm-scroller': {
        fontFamily: 'var(--font-mono)',
        lineHeight: '1.65',
        paddingBottom: '35vh',
      },
      '.cm-content': { caretColor: 'var(--accent)', padding: '8px 0' },
      '.cm-line': { padding: '0 16px' },
      '.cm-gutters': {
        backgroundColor: 'transparent',
        color: 'var(--muted)',
        border: 'none',
        borderRight: '1px solid var(--border)',
      },
      '.cm-activeLine': { backgroundColor: 'var(--line-active)' },
      '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--fg)' },
      '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
        backgroundColor: 'var(--selection) !important',
      },
      '.cm-cursor, .cm-dropCursor': { borderLeft: '2px solid var(--accent)' },
      '.cm-searchMatch': { backgroundColor: 'var(--match)' },
      '.cm-searchMatch-selected': { backgroundColor: 'var(--match-active)' },
      '.cm-matchingBracket': {
        backgroundColor: 'var(--bracket)',
        outline: '1px solid var(--border-strong)',
      },
      '.cm-panels': { backgroundColor: 'var(--panel)', color: 'var(--fg)' },
      '.cm-panels-bottom': { borderTop: '1px solid var(--border)' },
      '.cm-panel.cm-search': { padding: '8px 12px', fontSize: '12px' },
      '.cm-panel.cm-search input, .cm-panel.cm-search button': {
        backgroundColor: 'var(--input)',
        color: 'var(--fg)',
        border: '1px solid var(--border-strong)',
        borderRadius: '4px',
        margin: '2px',
      },
      '.cm-panel.cm-search label': { color: 'var(--muted)' },
      '.cm-tooltip': {
        backgroundColor: 'var(--panel)',
        border: '1px solid var(--border-strong)',
        borderRadius: '6px',
      },
      '.cm-tooltip-autocomplete ul li[aria-selected]': {
        backgroundColor: 'var(--accent)',
        color: 'var(--on-accent)',
      },
      '.cm-foldPlaceholder': {
        backgroundColor: 'var(--input)',
        border: '1px solid var(--border-strong)',
        color: 'var(--muted)',
      },
    },
    { dark: name === 'dark' },
  )
}

function themeExtension(name: ThemeName): Extension {
  return [
    chromeTheme(name),
    ...(name === 'dark'
      ? [oneDark]
      : [syntaxHighlighting(defaultHighlightStyle, { fallback: true })]),
  ]
}

function wrapExtension(enabled: boolean): Extension {
  return enabled ? EditorView.lineWrapping : []
}

function fontExtension(size: number): Extension {
  return EditorView.theme({
    '&': { fontSize: `${size}px` },
    '.cm-gutters': { fontSize: `${Math.max(10, size - 2)}px` },
  })
}

function gutterExtension(enabled: boolean): Extension {
  return enabled ? [lineNumbers(), highlightActiveLineGutter(), foldGutter()] : []
}

function indentExtension(size: number): Extension {
  return [EditorState.tabSize.of(size), indentUnit.of(' '.repeat(size))]
}

function whitespaceExtension(enabled: boolean): Extension {
  return enabled ? highlightWhitespace() : []
}

/** Line/col and document statistics shown in the status bar. */
function computeStatus(state: EditorState, text: string): EditorStatus {
  const range = state.selection.main
  const headLine = state.doc.lineAt(range.head)
  const selected = range.to - range.from
  const selectionLines =
    selected === 0 ? 0 : state.doc.lineAt(range.to).number - state.doc.lineAt(range.from).number + 1

  return {
    line: headLine.number,
    col: range.head - headLine.from + 1,
    selectionChars: selected,
    selectionLines,
    lines: state.doc.lines,
    chars: text.length,
    // Word counting is O(n); skip it for documents big enough to matter.
    words: text.length > 1_000_000 ? -1 : countWords(text),
  }
}

interface EditorConfig {
  language: Extension[]
  theme: ThemeName
  wrap: boolean
  fontSize: number
  gutter: boolean
  tabSize: number
  whitespace: boolean
}

export function createEditor(parent: HTMLElement, options: CreateEditorOptions): EditorHost {
  // Per-instance compartments: two editors must never share reconfiguration state.
  const languageSlot = new Compartment()
  const themeSlot = new Compartment()
  const wrapSlot = new Compartment()
  const fontSlot = new Compartment()
  const gutterSlot = new Compartment()
  const indentSlot = new Compartment()
  const whitespaceSlot = new Compartment()

  // Mirrors what is currently applied. Swapping documents means building a
  // fresh EditorState, and a fresh state would otherwise resurrect the *initial*
  // values baked into the extension list — silently reverting the user's theme,
  // font size, wrap and language mode on every tab switch.
  const config: EditorConfig = {
    language: [],
    theme: 'dark',
    wrap: true,
    fontSize: 14,
    gutter: true,
    tabSize: 2,
    whitespace: false,
  }

  const staticExtensions: Extension[] = [
    highlightSpecialChars(),
    history(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    autocompletion(),
    rectangularSelection(),
    crosshairCursor(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...completionKeymap,
      indentWithTab,
    ]),
    EditorView.updateListener.of((update) => {
      if (!update.docChanged && !update.selectionSet && !update.viewportChanged) return
      const range = update.state.selection.main
      const text = update.state.doc.toString()
      options.onUpdate({
        docChanged: update.docChanged,
        doc: text,
        anchor: range.anchor,
        head: range.head,
        scroll: update.view.scrollDOM.scrollTop,
        status: computeStatus(update.state, text),
      })
    }),
  ]

  const buildExtensions = (): Extension[] => [
    ...staticExtensions,
    gutterSlot.of(gutterExtension(config.gutter)),
    languageSlot.of(config.language),
    themeSlot.of(themeExtension(config.theme)),
    wrapSlot.of(wrapExtension(config.wrap)),
    fontSlot.of(fontExtension(config.fontSize)),
    indentSlot.of(indentExtension(config.tabSize)),
    whitespaceSlot.of(whitespaceExtension(config.whitespace)),
  ]

  const view = new EditorView({
    parent,
    state: EditorState.create({ doc: '', extensions: buildExtensions() }),
  })

  return {
    view,
    load(doc, anchor, head, scroll) {
      const length = doc.length
      view.setState(
        EditorState.create({
          doc,
          selection: {
            anchor: Math.max(0, Math.min(anchor, length)),
            head: Math.max(0, Math.min(head, length)),
          },
          extensions: buildExtensions(),
        }),
      )

      // setState() does not run update listeners, so publish the new document's
      // stats by hand — otherwise the status bar keeps showing the previous
      // tab's line, column and word count after a tab switch.
      const range = view.state.selection.main
      options.onUpdate({
        docChanged: false,
        doc,
        anchor: range.anchor,
        head: range.head,
        scroll,
        status: computeStatus(view.state, doc),
      })

      // The scroller only knows its real height after layout, so defer.
      requestAnimationFrame(() => {
        view.scrollDOM.scrollTop = scroll
      })
    },
    // Each entry records the new value in `config` *before* dispatching, so a
    // later document swap rebuilds the state with these settings still applied.
    reconfigure: {
      language(extension) {
        config.language = extension
        view.dispatch({ effects: languageSlot.reconfigure(extension) })
      },
      theme(name) {
        config.theme = name
        view.dispatch({ effects: themeSlot.reconfigure(themeExtension(name)) })
      },
      wrap(enabled) {
        config.wrap = enabled
        view.dispatch({ effects: wrapSlot.reconfigure(wrapExtension(enabled)) })
      },
      font(size) {
        config.fontSize = size
        view.dispatch({ effects: fontSlot.reconfigure(fontExtension(size)) })
      },
      gutter(enabled) {
        config.gutter = enabled
        view.dispatch({ effects: gutterSlot.reconfigure(gutterExtension(enabled)) })
      },
      indent(size) {
        config.tabSize = size
        view.dispatch({ effects: indentSlot.reconfigure(indentExtension(size)) })
      },
      whitespace(enabled) {
        config.whitespace = enabled
        view.dispatch({ effects: whitespaceSlot.reconfigure(whitespaceExtension(enabled)) })
      },
    },
    destroy: () => view.destroy(),
  }
}
