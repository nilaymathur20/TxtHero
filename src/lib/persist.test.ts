import { beforeEach, describe, expect, it } from 'vitest'
import { clearSession, loadSession, saveSession, shouldPersist, type PersistedSession } from './persist'
import { DEFAULT_SETTINGS } from '../state/types'

const session = (): PersistedSession => ({
  version: 1,
  activeTabId: 'tab-a',
  tabs: [
    { id: 'tab-a', name: 'notes.md', path: 'docs/notes.md', content: '# hi', languageId: 'markdown' },
    { id: 'tab-b', name: 'draft.txt', path: null, content: 'unsaved work', languageId: 'plaintext' },
  ],
  settings: { ...DEFAULT_SETTINGS, fontSize: 18, showPreview: true },
  savedAt: 1_700_000_000_000,
})

describe('session persistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('survives a save/load round trip', () => {
    saveSession(session())
    expect(loadSession()).toEqual(session())
  })

  it('returns null when nothing was stored', () => {
    expect(loadSession()).toBeNull()
  })

  it('returns null rather than throwing on corrupt data', () => {
    localStorage.setItem('txthero.session.v1', '{not json')
    expect(loadSession()).toBeNull()
  })

  it('rejects a payload from a different schema version', () => {
    localStorage.setItem('txthero.session.v1', JSON.stringify({ version: 99, tabs: [] }))
    expect(loadSession()).toBeNull()
  })

  it('rejects a payload with no tabs array', () => {
    localStorage.setItem('txthero.session.v1', JSON.stringify({ version: 1 }))
    expect(loadSession()).toBeNull()
  })

  it('clears the stored session', () => {
    saveSession(session())
    clearSession()
    expect(loadSession()).toBeNull()
  })
})

describe('shouldPersist', () => {
  it('accepts documents under the cap', () => {
    expect(shouldPersist('hello')).toBe(true)
    expect(shouldPersist('x'.repeat(400_000))).toBe(true)
  })

  it('rejects documents over the cap so localStorage cannot blow its quota', () => {
    expect(shouldPersist('x'.repeat(400_001))).toBe(false)
  })
})
