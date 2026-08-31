import { afterEach, describe, expect, it } from 'vitest'
import { ensureSyntaxTree } from '@codemirror/language'
import { createEditor, type EditorHost, type UpdatePayload } from './setup'

/**
 * These run against the real CodeMirror instance in jsdom, so they exercise
 * the actual extension wiring — compartments, the update listener, and
 * computeStatus — not a re-implementation of them.
 */

const hosts: EditorHost[] = []

function mount(onUpdate: (payload: UpdatePayload) => void = () => {}): { host: EditorHost; updates: UpdatePayload[] } {
  const parent = document.createElement('div')
  document.body.appendChild(parent)
  const updates: UpdatePayload[] = []
  const host = createEditor(parent, {
    onUpdate(payload) {
      updates.push(payload)
      onUpdate(payload)
    },
  })
  hosts.push(host)
  return { host, updates }
}

afterEach(() => {
  while (hosts.length > 0) {
    const host = hosts.pop()
    host?.destroy()
  }
  document.body.innerHTML = ''
})

describe('createEditor', () => {
  it('starts with an empty document', () => {
    const { host } = mount()
    expect(host.view.state.doc.toString()).toBe('')
  })

  it('replaces the document and clamps an out-of-range caret', () => {
    const { host } = mount()
    host.load('hello\nworld', 0, 0, 0)
    expect(host.view.state.doc.toString()).toBe('hello\nworld')

    host.load('abc', 99, 99, 0)
    expect(host.view.state.selection.main.head).toBe(3)

    host.load('abc', -5, -5, 0)
    expect(host.view.state.selection.main.head).toBe(0)
  })
})

describe('update listener and computed status', () => {
  it('reports a document change with the new text', () => {
    const { host, updates } = mount()
    host.view.dispatch({ changes: { from: 0, insert: 'hello world' } })

    const last = updates.at(-1)
    expect(last).toBeDefined()
    expect(last?.docChanged).toBe(true)
    expect(last?.doc).toBe('hello world')
  })

  it('counts lines, characters and words', () => {
    const { host, updates } = mount()
    host.view.dispatch({ changes: { from: 0, insert: 'one two three\nfour' } })

    const status = updates.at(-1)?.status
    expect(status?.lines).toBe(2)
    expect(status?.chars).toBe('one two three\nfour'.length)
    expect(status?.words).toBe(4)
  })

  it('derives line and column from the caret (head), not the anchor', () => {
    const { host, updates } = mount()
    host.load('one\ntwo\nthree', 0, 0, 0)
    // head=6 is the "o" of "two" — line 2, column 3.
    host.view.dispatch({ selection: { anchor: 4, head: 6 } })

    const status = updates.at(-1)?.status
    expect(status?.line).toBe(2)
    expect(status?.col).toBe(3)
    expect(status?.selectionChars).toBe(2)
    expect(status?.selectionLines).toBe(1)
  })

  it('publishes stats when a document is loaded, even though setState skips listeners', () => {
    const { host, updates } = mount()
    expect(updates).toHaveLength(0)

    host.load('alpha beta\ngamma', 0, 0, 0)

    expect(updates).toHaveLength(1)
    expect(updates[0].docChanged).toBe(false)
    expect(updates[0].status.lines).toBe(2)
    expect(updates[0].status.words).toBe(3)
    expect(updates[0].status.line).toBe(1)
  })

  it('spans selectionLines across a multi-line selection', () => {
    const { host, updates } = mount()
    host.load('one\ntwo\nthree', 0, 0, 0)
    host.view.dispatch({ selection: { anchor: 0, head: 12 } })

    const status = updates.at(-1)?.status
    expect(status?.selectionLines).toBe(3)
    expect(status?.selectionChars).toBe(12)
  })

  it('reports a selection-only change as not a document change', () => {
    const { host, updates } = mount()
    host.load('abcdef', 0, 0, 0)
    const before = updates.length
    host.view.dispatch({ selection: { anchor: 3 } })

    expect(updates.length).toBeGreaterThan(before)
    expect(updates.at(-1)?.docChanged).toBe(false)
    expect(updates.at(-1)?.status.col).toBe(4)
  })

  it('skips word counting on very large documents', () => {
    const { host, updates } = mount()
    host.load('x'.repeat(1_000_001), 0, 0, 0)
    host.view.dispatch({ selection: { anchor: 1 } })
    expect(updates.at(-1)?.status.words).toBe(-1)
  })
})

describe('live reconfiguration', () => {
  it('changes the tab size through the indent compartment', () => {
    const { host } = mount()
    expect(host.view.state.tabSize).toBe(2)
    host.reconfigure.indent(4)
    expect(host.view.state.tabSize).toBe(4)
  })

  it('keeps the document and caret intact across a wrap toggle', () => {
    const { host } = mount()
    host.load('a rather long line of text', 5, 5, 0)

    host.reconfigure.wrap(false)
    host.reconfigure.wrap(true)

    expect(host.view.state.doc.toString()).toBe('a rather long line of text')
    expect(host.view.state.selection.main.head).toBe(5)
    host.view.dispatch({ changes: { from: 5, insert: '!' } })
    expect(host.view.state.doc.toString()).toBe('a rat!her long line of text')
  })

  it('survives every reconfigure path without throwing', () => {
    const { host } = mount()
    expect(() => {
      host.reconfigure.theme('light')
      host.reconfigure.theme('dark')
      host.reconfigure.font(20)
      host.reconfigure.gutter(false)
      host.reconfigure.gutter(true)
      host.reconfigure.whitespace(true)
      host.reconfigure.whitespace(false)
    }).not.toThrow()
    expect(host.view.state.doc.toString()).toBe('')
  })

  it('installs a real grammar that parses the document', async () => {
    const { host } = mount()
    const { json } = await import('@codemirror/lang-json')
    host.reconfigure.language([json()])
    host.load('{ "a": 1 }', 0, 0, 0)

    // Parsing is scheduled on idle callbacks, which jsdom never pumps, so the
    // tree has to be forced before it can be inspected.
    const tree = ensureSyntaxTree(host.view.state, 5000)
    expect(tree, 'grammar should produce a syntax tree').not.toBeNull()
    expect(tree?.topNode.type.name.toLowerCase()).toContain('json')
  })

  it('keeps every configured setting across a document swap', async () => {
    const { host } = mount()
    const { json } = await import('@codemirror/lang-json')

    host.reconfigure.language([json()])
    host.reconfigure.indent(4)
    host.reconfigure.theme('light')
    host.reconfigure.wrap(false)
    host.reconfigure.font(20)
    host.reconfigure.gutter(false)

    // Regression guard: swapping documents rebuilds EditorState, which used to
    // drop every compartment back to its initial value — so a tab switch reset
    // the user's theme, font size, wrap and language mode.
    host.load('{ "swapped": true }', 0, 0, 0)

    expect(host.view.state.tabSize).toBe(4)
    const tree = ensureSyntaxTree(host.view.state, 5000)
    expect(tree?.topNode.type.name.toLowerCase()).toContain('json')
  })
})

describe('editor isolation', () => {
  it('gives each instance its own compartments', () => {
    const first = mount().host
    const second = mount().host

    first.reconfigure.indent(8)

    expect(first.view.state.tabSize).toBe(8)
    // Regression guard: module-level compartments would leak this to `second`.
    expect(second.view.state.tabSize).toBe(2)
  })

  it('keeps document state independent', () => {
    const first = mount().host
    const second = mount().host

    first.load('first document', 0, 0, 0)
    expect(second.view.state.doc.toString()).toBe('')
  })
})

describe('lifecycle', () => {
  it('detaches the editor from the DOM on destroy', () => {
    const { host } = mount()
    host.load('text', 0, 0, 0)
    expect(host.view.dom.isConnected).toBe(true)

    host.destroy()
    const index = hosts.indexOf(host)
    if (index >= 0) hosts.splice(index, 1)

    expect(host.view.dom.isConnected).toBe(false)
  })
})
