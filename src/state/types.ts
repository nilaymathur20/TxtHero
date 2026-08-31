import type { LanguageId } from '../lib/languages'
import type { TxtFileSystemFileHandle } from '../vite-env'

export type ThemeName = 'dark' | 'light'

export interface Settings {
  theme: ThemeName
  wordWrap: boolean
  fontSize: number
  lineNumbers: boolean
  tabSize: number
  showSidebar: boolean
  showPreview: boolean
  showWhitespace: boolean
}

export interface TabCursor {
  anchor: number
  head: number
}

export interface Tab {
  id: string
  name: string
  /** Path relative to the opened directory root, or null for loose/draft files. */
  path: string | null
  content: string
  /** Last content known to be on disk; `content !== savedContent` means dirty. */
  savedContent: string
  handle: TxtFileSystemFileHandle | null
  languageId: LanguageId
  /** Bumped when content is replaced outside the editor (revert, format, open). */
  rev: number
  cursor: TabCursor
  scroll: number
}

export type NoticeKind = 'info' | 'success' | 'error'

export interface Notice {
  id: number
  kind: NoticeKind
  text: string
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  wordWrap: true,
  fontSize: 14,
  lineNumbers: true,
  tabSize: 2,
  showSidebar: true,
  showPreview: false,
  showWhitespace: false,
}
