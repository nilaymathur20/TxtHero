import { useEffect, useRef, useState } from 'react'
import { useEditor } from '../state/EditorContext'
import { isDirty } from '../state/reducer'

export function TabBar() {
  const { state, actions } = useEditor()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (editingId !== null) inputRef.current?.select()
  }, [editingId])

  if (state.tabs.length === 0) return null

  const commit = () => {
    if (editingId) actions.rename(editingId, draft)
    setEditingId(null)
  }

  const beginRename = (id: string, currentName: string) => {
    setEditingId(id)
    setDraft(currentName)
  }

  return (
    <div className="tabbar" role="tablist" aria-label="Open files">
      <div className="tabbar-scroll">
        {state.tabs.map((tab) => {
          const active = tab.id === state.activeTabId
          const dirty = isDirty(tab)
          return (
            <div
              key={tab.id}
              role="tab"
              aria-selected={active}
              className={`tab${active ? ' is-active' : ''}`}
              title={tab.path ? `${tab.path}${dirty ? ' — unsaved changes' : ''}` : tab.name}
              onClick={() => actions.activateTab(tab.id)}
              onDoubleClick={() => beginRename(tab.id, tab.name)}
              onAuxClick={(event) => {
                if (event.button === 1) {
                  event.preventDefault()
                  actions.closeTab(tab.id)
                }
              }}
            >
              {editingId === tab.id ? (
                <input
                  ref={inputRef}
                  className="tab-rename"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onBlur={commit}
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') commit()
                    if (event.key === 'Escape') setEditingId(null)
                  }}
                />
              ) : (
                <>
                  <span className="tab-name">{tab.name}</span>
                  <button
                    type="button"
                    className={`tab-close${dirty ? ' is-dirty' : ''}`}
                    aria-label={dirty ? `Unsaved changes in ${tab.name}` : `Close ${tab.name}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      actions.closeTab(tab.id)
                    }}
                  >
                    {dirty ? '\u25CF' : '\u00D7'}
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
