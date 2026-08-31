import { useState, type ReactNode } from 'react'
import type { TreeNode } from '../lib/files'
import { useEditor } from '../state/EditorContext'

function TreeItem({ node, depth }: { node: TreeNode; depth: number }) {
  const { state, actions } = useEditor()
  const [open, setOpen] = useState(false)

  const isActive = node.kind === 'file' && state.tabs.some((tab) => tab.path === node.path && tab.id === state.activeTabId)

  if (node.kind === 'directory') {
    return (
      <div className="tree-group">
        <button
          type="button"
          className="tree-row is-directory"
          style={{ paddingLeft: `${8 + depth * 12}px` }}
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          <span className="tree-caret">{open ? '\u25BE' : '\u25B8'}</span>
          <span className="tree-label">{node.name}</span>
          <span className="tree-count">{node.children.length}</span>
        </button>
        {open && (
          <div className="tree-children">
            {node.children.map((child) => (
              <TreeItem key={child.path} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <button
      type="button"
      className={`tree-row is-file${isActive ? ' is-active' : ''}`}
      style={{ paddingLeft: `${8 + depth * 12 + 14}px` }}
      onClick={() => void actions.openTreePath(node.path)}
      title={node.path}
    >
      <span className="tree-label">{node.name}</span>
    </button>
  )
}

export function Sidebar() {
  const { state, actions } = useEditor()

  const body: ReactNode = state.rootHandle ? (
    state.tree.length === 0 ? (
      <p className="sidebar-empty">This folder is empty.</p>
    ) : (
      state.tree.map((node) => <TreeItem key={node.path} node={node} depth={0} />)
    )
  ) : (
    <div className="sidebar-empty">
      <p>No folder open.</p>
      <button type="button" className="btn" onClick={() => void actions.openFolder()}>
        Open Folder
      </button>
    </div>
  )

  return (
    <aside className="sidebar" aria-label="File explorer">
      <div className="sidebar-head">
        <span className="sidebar-title" title={state.rootName ?? undefined}>
          {state.rootName ?? 'Explorer'}
        </span>
        <div className="sidebar-actions">
          <button
            type="button"
            className="icon-btn"
            title="Refresh file list"
            aria-label="Refresh file list"
            onClick={() => void actions.openFolder()}
          >
            {'\u21BB'}
          </button>
          <button
            type="button"
            className="icon-btn"
            title="Close folder"
            aria-label="Close folder"
            onClick={actions.closeFolder}
          >
            {'\u00D7'}
          </button>
        </div>
      </div>
      <div className="sidebar-body">{state.treeLoading ? <p className="sidebar-empty">Reading folder…</p> : body}</div>
    </aside>
  )
}
