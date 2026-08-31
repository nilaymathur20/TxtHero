import type { LanguageId } from './languages'
import type { Settings } from '../state/types'

/**
 * Session persistence.
 *
 * File handles cannot survive a reload, so we restore the *contents* as
 * unsaved drafts — reopening the folder re-links them by path. Draft text is
 * capped per file so one giant paste can't blow the ~5 MB localStorage quota.
 */

const KEY = 'txthero.session.v1'
const MAX_PERSISTED_BYTES = 400_000

export interface PersistedTab {
  id: string
  name: string
  path: string | null
  content: string
  languageId: LanguageId
}

export interface PersistedSession {
  version: 1
  activeTabId: string | null
  tabs: PersistedTab[]
  settings: Settings
  savedAt: number
}

export function loadSession(): PersistedSession | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedSession
    if (parsed.version !== 1 || !Array.isArray(parsed.tabs)) return null
    return parsed
  } catch {
    return null
  }
}

export function saveSession(session: PersistedSession): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(session))
  } catch {
    // Quota exceeded or storage disabled — the editor keeps working, it just
    // won't restore next time. Not worth interrupting the user for.
    try {
      const trimmed: PersistedSession = {
        ...session,
        tabs: session.tabs
          .filter((tab) => tab.content.length <= MAX_PERSISTED_BYTES)
          .map((tab) => ({ ...tab })),
      }
      localStorage.setItem(KEY, JSON.stringify(trimmed))
    } catch {
      /* give up silently */
    }
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

export function shouldPersist(content: string): boolean {
  return content.length <= MAX_PERSISTED_BYTES
}
