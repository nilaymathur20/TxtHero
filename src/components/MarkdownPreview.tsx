import { useMemo } from 'react'
import { marked } from 'marked'
import { useEditor } from '../state/EditorContext'

export function MarkdownPreview() {
  const { activeTab } = useEditor()
  const content = activeTab?.content ?? ''

  const html = useMemo(() => {
    if (content.trim().length === 0) return '<p class="preview-empty">Nothing to preview yet.</p>'
    try {
      return marked.parse(content, { async: false, gfm: true }) as string
    } catch {
      return '<p class="preview-empty">This document could not be rendered.</p>'
    }
  }, [content])

  return (
    <div className="preview" aria-label="Markdown preview">
      <div className="preview-head">
        <span>Preview</span>
        <span className="preview-file">{activeTab?.name ?? ''}</span>
      </div>
      {/*
        marked does not sanitise its output. That is acceptable here because
        TxtHero only ever renders text the user opened themselves, in their own
        browser — nothing is served to another user. If the editor ever grows a
        share/collaborate feature, this needs a sanitiser in front of it.
      */}
      <div className="markdown" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}
