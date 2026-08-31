import { useCallback, useEffect, useRef } from 'react'
import { useEditor } from '../state/EditorContext'
import { createEditor, type EditorHost } from '../editor/setup'
import { editorStatus } from '../editor/status'
import { languageById } from '../lib/languages'
import { MarkdownPreview } from './MarkdownPreview'

interface Viewport {
  anchor: number
  head: number
  scroll: number
}

/**
 * Owns the single CodeMirror instance.
 *
 * Rather than rebuilding the editor on every tab switch, the document is
 * swapped in place and each tab's caret/scroll is cached in a ref. Caret
 * movement therefore never touches React state — only real text edits do.
 */
export function EditorPane() {
  const { state, actions, activeTab } = useEditor()
  const { setViewport } = actions

  const mountRef = useRef<HTMLDivElement | null>(null)
  const hostRef = useRef<EditorHost | null>(null)
  const activeIdRef = useRef<string | null>(null)
  const loadedKeyRef = useRef('')
  const viewports = useRef(new Map<string, Viewport>())
  const actionsRef = useRef(actions)
  actionsRef.current = actions

  const flushViewport = useCallback(() => {
    const id = activeIdRef.current
    if (!id) return
    const viewport = viewports.current.get(id)
    if (!viewport) return
    setViewport(id, { anchor: viewport.anchor, head: viewport.head }, viewport.scroll)
  }, [setViewport])

  // Create once, destroy on unmount.
  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const host = createEditor(mount, {
      onUpdate(payload) {
        const id = activeIdRef.current
        if (id) {
          viewports.current.set(id, {
            anchor: payload.anchor,
            head: payload.head,
            scroll: payload.scroll,
          })
          if (payload.docChanged) actionsRef.current.setContent(id, payload.doc)
        }
        editorStatus.set(payload.status)
      },
    })

    hostRef.current = host
    loadedKeyRef.current = ''

    return () => {
      flushViewport()
      host.destroy()
      hostRef.current = null
      activeIdRef.current = null
      loadedKeyRef.current = ''
    }
  }, [flushViewport])

  // Swap documents when the active tab (or a revert) changes.
  useEffect(() => {
    const host = hostRef.current
    if (!host || !activeTab) return

    const key = `${activeTab.id}#${activeTab.rev}`
    if (loadedKeyRef.current === key) return

    // Persist where the outgoing tab was before replacing its document.
    flushViewport()

    activeIdRef.current = activeTab.id
    loadedKeyRef.current = key

    const cached = viewports.current.get(activeTab.id)
    host.load(
      activeTab.content,
      cached ? cached.anchor : activeTab.cursor.anchor,
      cached ? cached.head : activeTab.cursor.head,
      cached ? cached.scroll : activeTab.scroll,
    )
    host.view.focus()
  }, [activeTab, flushViewport])

  // Grammar is loaded lazily; guard against a fast tab switch resolving late.
  const languageId = activeTab?.languageId ?? 'plaintext'
  const tabId = activeTab?.id
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let cancelled = false
    languageById(languageId)
      .load()
      .then((extension) => {
        if (!cancelled) host.reconfigure.language(extension)
      })
      .catch(() => {
        /* a failed grammar falls back to plain text, which is already loaded */
      })
    return () => {
      cancelled = true
    }
  }, [languageId, tabId])

  const { theme, wordWrap, fontSize, lineNumbers, tabSize, showWhitespace } = state.settings
  useEffect(() => {
    hostRef.current?.reconfigure.theme(theme)
  }, [theme])
  useEffect(() => {
    hostRef.current?.reconfigure.wrap(wordWrap)
  }, [wordWrap])
  useEffect(() => {
    hostRef.current?.reconfigure.font(fontSize)
  }, [fontSize])
  useEffect(() => {
    hostRef.current?.reconfigure.gutter(lineNumbers)
  }, [lineNumbers])
  useEffect(() => {
    hostRef.current?.reconfigure.indent(tabSize)
  }, [tabSize])
  useEffect(() => {
    hostRef.current?.reconfigure.whitespace(showWhitespace)
  }, [showWhitespace])

  return (
    <div className="editor-area">
      <div className="editor-host" ref={mountRef} />
      {state.settings.showPreview && <MarkdownPreview />}
    </div>
  )
}
