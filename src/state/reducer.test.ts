import { describe, expect, it } from 'vitest'
import { initialState, isDirty, reducer, type NewTabInput } from './reducer'
import type { LanguageId } from '../lib/languages'

const input = (name: string, content = '', languageId: LanguageId = 'plaintext'): NewTabInput => ({
  name,
  content,
  path: null,
  handle: null,
  languageId,
})

const addTabs = (...names: string[]) =>
  reducer(initialState, { type: 'tabs/add', tabs: names.map((name) => input(name, 'body')) })

describe('reducer: tabs/add', () => {
  it('creates a tab per input and activates the last one', () => {
    const state = addTabs('a.txt', 'b.txt', 'c.txt')
    expect(state.tabs).toHaveLength(3)
    expect(state.tabs.map((tab) => tab.name)).toEqual(['a.txt', 'b.txt', 'c.txt'])
    expect(state.activeTabId).toBe(state.tabs[2].id)
  })

  it('gives every tab a distinct id', () => {
    const state = addTabs('same.txt', 'same.txt', 'same.txt')
    expect(new Set(state.tabs.map((tab) => tab.id)).size).toBe(3)
  })

  it('marks freshly opened content as clean', () => {
    const state = addTabs('a.txt')
    expect(isDirty(state.tabs[0])).toBe(false)
    expect(state.tabs[0].savedContent).toBe('body')
  })

  it('ignores an empty batch', () => {
    const state = reducer(initialState, { type: 'tabs/add', tabs: [] })
    expect(state).toBe(initialState)
  })
})

describe('reducer: dirty tracking', () => {
  it('flags a tab dirty when content diverges from savedContent', () => {
    let state = addTabs('a.txt')
    const id = state.tabs[0].id
    state = reducer(state, { type: 'tabs/content', id, content: 'edited' })
    expect(isDirty(state.tabs[0])).toBe(true)
  })

  it('is a no-op when content is unchanged', () => {
    const before = addTabs('a.txt')
    const after = reducer(before, { type: 'tabs/content', id: before.tabs[0].id, content: 'body' })
    expect(after).toBe(before)
  })

  it('clears the dirty flag on save', () => {
    let state = addTabs('a.txt')
    const id = state.tabs[0].id
    state = reducer(state, { type: 'tabs/content', id, content: 'edited' })
    expect(isDirty(state.tabs[0])).toBe(true)
    state = reducer(state, {
      type: 'tabs/saved',
      id,
      content: 'edited',
      name: 'a.txt',
      path: null,
      handle: null,
    })
    expect(isDirty(state.tabs[0])).toBe(false)
  })
})

describe('reducer: tabs/replace (revert)', () => {
  it('restores saved content and bumps rev so the editor reloads it', () => {
    let state = addTabs('a.txt')
    const id = state.tabs[0].id
    const revBefore = state.tabs[0].rev
    state = reducer(state, { type: 'tabs/content', id, content: 'edited' })
    expect(state.tabs[0].rev).toBe(revBefore)
    state = reducer(state, { type: 'tabs/replace', id, content: 'body' })
    expect(state.tabs[0].content).toBe('body')
    expect(state.tabs[0].rev).toBe(revBefore + 1)
  })
})

describe('reducer: language re-detection on save-as', () => {
  it('derives the grammar from a renamed file', () => {
    let state = reducer(initialState, {
      type: 'tabs/add',
      tabs: [input('draft', 'x', 'python')],
    })
    const id = state.tabs[0].id
    state = reducer(state, {
      type: 'tabs/saved',
      id,
      content: 'x',
      name: 'notes.md',
      path: null,
      handle: null,
    })
    expect(state.tabs[0].languageId).toBe('markdown')
  })

  it('keeps a manually chosen language when the name has no extension', () => {
    let state = reducer(initialState, {
      type: 'tabs/add',
      tabs: [input('draft', 'x', 'python')],
    })
    const id = state.tabs[0].id
    state = reducer(state, {
      type: 'tabs/saved',
      id,
      content: 'x',
      name: 'script',
      path: null,
      handle: null,
    })
    expect(state.tabs[0].languageId).toBe('python')
  })
})

describe('reducer: tabs/close picks the next active tab', () => {
  it('activates the following tab when the active one closes', () => {
    const state = addTabs('a.txt', 'b.txt', 'c.txt')
    const [a, b] = state.tabs
    const closed = reducer(state, { type: 'tabs/close', id: b.id })
    expect(closed.activeTabId).not.toBe(b.id)
    expect(closed.tabs.some((tab) => tab.id === b.id)).toBe(false)
    // b was active, so focus moves to a surviving neighbour.
    expect([a.id, state.tabs[2].id]).toContain(closed.activeTabId)
  })

  it('leaves the active tab alone when a background tab closes', () => {
    const state = addTabs('a.txt', 'b.txt', 'c.txt')
    const active = state.activeTabId
    const closed = reducer(state, { type: 'tabs/close', id: state.tabs[0].id })
    expect(closed.activeTabId).toBe(active)
  })

  it('nulls the active tab when the last one closes', () => {
    const state = addTabs('only.txt')
    const closed = reducer(state, { type: 'tabs/close', id: state.tabs[0].id })
    expect(closed.tabs).toHaveLength(0)
    expect(closed.activeTabId).toBeNull()
  })
})

describe('reducer: settings and ui', () => {
  it('merges a partial settings patch', () => {
    const state = reducer(initialState, { type: 'settings/set', patch: { fontSize: 20 } })
    expect(state.settings.fontSize).toBe(20)
    expect(state.settings.theme).toBe(initialState.settings.theme)
  })

  it('closes quick open when the palette opens', () => {
    let state = reducer(initialState, { type: 'ui/quickOpen', open: true })
    expect(state.quickOpenOpen).toBe(true)
    state = reducer(state, { type: 'ui/palette', open: true })
    expect(state.paletteOpen).toBe(true)
    expect(state.quickOpenOpen).toBe(false)
  })

  it('opening the tree also reveals the sidebar', () => {
    const hidden = reducer(initialState, { type: 'settings/set', patch: { showSidebar: false } })
    const handle = { kind: 'directory', name: 'proj' } as never
    const state = reducer(hidden, { type: 'tree/set', rootName: 'proj', rootHandle: handle, tree: [] })
    expect(state.settings.showSidebar).toBe(true)
    expect(state.rootName).toBe('proj')
  })
})

describe('reducer: session restore', () => {
  it('replaces tabs and settings wholesale', () => {
    const tabs = addTabs('restored.txt').tabs
    const state = reducer(addTabs('temp.txt'), {
      type: 'session/restore',
      tabs,
      activeTabId: tabs[0].id,
      settings: { ...initialState.settings, fontSize: 22 },
    })
    expect(state.tabs).toHaveLength(1)
    expect(state.tabs[0].name).toBe('restored.txt')
    expect(state.activeTabId).toBe(tabs[0].id)
    expect(state.settings.fontSize).toBe(22)
  })
})
