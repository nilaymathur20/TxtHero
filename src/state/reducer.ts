import type { TreeNode } from '../lib/files'
import type { TxtFileSystemDirectoryHandle } from '../vite-env'
import { DEFAULT_SETTINGS, type Notice, type NoticeKind, type Settings, type Tab, type TabCursor } from './types'
import { detectLanguage, type LanguageId } from '../lib/languages'

export interface EditorState {
  tabs: Tab[]
  activeTabId: string | null
  settings: Settings
  rootName: string | null
  rootHandle: TxtFileSystemDirectoryHandle | null
  tree: TreeNode[]
  treeLoading: boolean
  paletteOpen: boolean
  quickOpenOpen: boolean
  notice: Notice | null
}

export const initialState: EditorState = {
  tabs: [],
  activeTabId: null,
  settings: DEFAULT_SETTINGS,
  rootName: null,
  rootHandle: null,
  tree: [],
  treeLoading: false,
  paletteOpen: false,
  quickOpenOpen: false,
  notice: null,
}

export interface NewTabInput {
  name: string
  content: string
  path: string | null
  handle: Tab['handle']
  languageId: LanguageId
}

export type Action =
  | { type: 'tabs/add'; tabs: NewTabInput[] }
  | { type: 'tabs/new'; name: string }
  | { type: 'tabs/close'; id: string }
  | { type: 'tabs/activate'; id: string }
  | { type: 'tabs/content'; id: string; content: string }
  | { type: 'tabs/replace'; id: string; content: string }
  | { type: 'tabs/saved'; id: string; content: string; name: string; path: string | null; handle: Tab['handle'] }
  | { type: 'tabs/rename'; id: string; name: string; languageId: LanguageId }
  | { type: 'tabs/language'; id: string; languageId: LanguageId }
  | { type: 'tabs/viewport'; id: string; cursor: TabCursor; scroll: number }
  | { type: 'settings/set'; patch: Partial<Settings> }
  | { type: 'tree/load' }
  | { type: 'tree/set'; rootName: string; rootHandle: TxtFileSystemDirectoryHandle; tree: TreeNode[] }
  | { type: 'tree/clear' }
  | { type: 'ui/palette'; open: boolean }
  | { type: 'ui/quickOpen'; open: boolean }
  | { type: 'notice/set'; notice: Notice | null }
  | { type: 'session/restore'; tabs: Tab[]; activeTabId: string | null; settings: Settings }

/**
 * Apply `fn` to one tab, returning the *identical* state object when nothing
 * actually changed. Callers fire on every keystroke and every caret move, so a
 * gratuitous new object would re-render the whole shell for nothing.
 */
function mapTab(state: EditorState, id: string, fn: (tab: Tab) => Tab): EditorState {
  let changed = false
  const tabs = state.tabs.map((tab) => {
    if (tab.id !== id) return tab
    const next = fn(tab)
    if (next === tab) return tab
    changed = true
    return next
  })
  return changed ? { ...state, tabs } : state
}

function nextActiveId(state: EditorState, closingId: string): string | null {
  const index = state.tabs.findIndex((tab) => tab.id === closingId)
  if (index === -1) return state.activeTabId
  const remaining = state.tabs.length - 1
  if (remaining === 0) return null
  if (state.activeTabId !== closingId) return state.activeTabId
  const neighbour = state.tabs[index + 1] ?? state.tabs[index - 1]
  return neighbour ? neighbour.id : null
}

export function reducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case 'tabs/add': {
      if (action.tabs.length === 0) return state
      const created: Tab[] = action.tabs.map((input) => ({
        id: newId(),
        name: input.name,
        path: input.path,
        content: input.content,
        savedContent: input.content,
        handle: input.handle,
        languageId: input.languageId,
        rev: 0,
        cursor: { anchor: 0, head: 0 },
        scroll: 0,
      }))
      return {
        ...state,
        tabs: [...state.tabs, ...created],
        activeTabId: created[created.length - 1].id,
      }
    }

    case 'tabs/new': {
      const tab: Tab = {
        id: newId(),
        name: action.name,
        path: null,
        content: '',
        savedContent: '',
        handle: null,
        languageId: 'plaintext',
        rev: 0,
        cursor: { anchor: 0, head: 0 },
        scroll: 0,
      }
      return { ...state, tabs: [...state.tabs, tab], activeTabId: tab.id }
    }

    case 'tabs/close': {
      const activeTabId = nextActiveId(state, action.id)
      return {
        ...state,
        tabs: state.tabs.filter((tab) => tab.id !== action.id),
        activeTabId,
      }
    }

    case 'tabs/activate':
      return state.activeTabId === action.id ? state : { ...state, activeTabId: action.id }

    case 'tabs/content':
      return mapTab(state, action.id, (tab) =>
        tab.content === action.content ? tab : { ...tab, content: action.content },
      )

    case 'tabs/replace':
      return mapTab(state, action.id, (tab) => ({
        ...tab,
        content: action.content,
        rev: tab.rev + 1,
      }))

    case 'tabs/saved':
      return mapTab(state, action.id, (tab) => ({
        ...tab,
        content: action.content,
        savedContent: action.content,
        name: action.name,
        path: action.path,
        handle: action.handle,
        languageId: detectFromName(action.name, tab.languageId),
        rev: tab.rev + 1,
      }))

    case 'tabs/rename':
      return mapTab(state, action.id, (tab) => ({ ...tab, name: action.name, languageId: action.languageId }))

    case 'tabs/language':
      return mapTab(state, action.id, (tab) => ({ ...tab, languageId: action.languageId }))

    case 'tabs/viewport':
      return mapTab(state, action.id, (tab) => ({ ...tab, cursor: action.cursor, scroll: action.scroll }))

    case 'settings/set':
      return { ...state, settings: { ...state.settings, ...action.patch } }

    case 'tree/load':
      return { ...state, treeLoading: true }

    case 'tree/set':
      return {
        ...state,
        treeLoading: false,
        rootName: action.rootName,
        rootHandle: action.rootHandle,
        tree: action.tree,
        settings: { ...state.settings, showSidebar: true },
      }

    case 'tree/clear':
      return { ...state, treeLoading: false, rootName: null, rootHandle: null, tree: [] }

    case 'ui/palette':
      return { ...state, paletteOpen: action.open, quickOpenOpen: action.open ? false : state.quickOpenOpen }

    case 'ui/quickOpen':
      return { ...state, quickOpenOpen: action.open, paletteOpen: action.open ? false : state.paletteOpen }

    case 'notice/set':
      return { ...state, notice: action.notice }

    case 'session/restore':
      return {
        ...state,
        tabs: action.tabs,
        activeTabId: action.activeTabId,
        settings: { ...state.settings, ...action.settings },
      }

    default:
      return state
  }
}

/**
 * A save-as renames the tab, so re-derive the grammar from the new filename.
 * A name with no extension keeps whatever language was chosen manually.
 */
function detectFromName(name: string, fallback: LanguageId): LanguageId {
  if (!name.includes('.')) return fallback
  return detectLanguage(name)
}

let counter = 0
export function newId(): string {
  counter += 1
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10)
  return `tab-${Date.now().toString(36)}-${counter}-${random}`
}

export function makeNotice(kind: NoticeKind, text: string): Notice {
  return { id: Date.now() + Math.floor(Math.random() * 1000), kind, text }
}

export function isDirty(tab: Tab): boolean {
  return tab.content !== tab.savedContent
}
