import { useEffect, useMemo, useRef, useState } from 'react'
import { fuzzyScore } from '../lib/format'

export interface OverlayItem {
  id: string
  label: string
  detail?: string
  hint?: string
  run(): void
}

interface OverlayProps {
  title: string
  placeholder: string
  items: OverlayItem[]
  emptyText: string
  onClose(): void
}

/**
 * Shared modal list for the command palette and Quick Open:
 * fuzzy filter, arrow-key navigation, Enter to run, Escape to dismiss.
 */
export function Overlay({ title, placeholder, items, emptyText, onClose }: OverlayProps) {
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)

  const matches = useMemo(() => {
    if (query.trim().length === 0) return items.slice(0, 60)
    return items
      .map((item) => ({ item, score: fuzzyScore(query.trim(), `${item.label} ${item.detail ?? ''}`) }))
      .filter((entry) => entry.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 60)
      .map((entry) => entry.item)
  }, [items, query])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    setCursor(0)
  }, [query])

  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>(`[data-index="${cursor}"]`)
    node?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  // Escape must be captured before the editor's own bindings see it.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [onClose])

  const runAt = (index: number) => {
    const item = matches[index]
    if (!item) return
    onClose()
    item.run()
  }

  return (
    <div className="overlay-backdrop" onMouseDown={onClose}>
      <div className="overlay" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <input
          ref={inputRef}
          className="overlay-input"
          value={query}
          placeholder={placeholder}
          aria-label={title}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              setCursor((value) => (matches.length === 0 ? 0 : (value + 1) % matches.length))
            } else if (event.key === 'ArrowUp') {
              event.preventDefault()
              setCursor((value) => (matches.length === 0 ? 0 : (value - 1 + matches.length) % matches.length))
            } else if (event.key === 'Enter') {
              event.preventDefault()
              runAt(cursor)
            }
          }}
        />
        <div className="overlay-list" ref={listRef} role="listbox" aria-label={title}>
          {matches.length === 0 ? (
            <p className="overlay-empty">{emptyText}</p>
          ) : (
            matches.map((item, index) => (
              <button
                key={item.id}
                type="button"
                data-index={index}
                role="option"
                aria-selected={index === cursor}
                className={`overlay-row${index === cursor ? ' is-cursor' : ''}`}
                onMouseEnter={() => setCursor(index)}
                onClick={() => runAt(index)}
              >
                <span className="overlay-label">{item.label}</span>
                {item.detail && <span className="overlay-detail">{item.detail}</span>}
                {item.hint && <kbd className="overlay-hint">{item.hint}</kbd>}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
