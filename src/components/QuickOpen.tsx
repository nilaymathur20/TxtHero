import { useMemo } from 'react'
import { Overlay, type OverlayItem } from './Overlay'
import type { TreeNode } from '../lib/files'
import { useEditor } from '../state/EditorContext'

function flatten(nodes: TreeNode[], out: TreeNode[] = []): TreeNode[] {
  for (const node of nodes) {
    if (node.kind === 'file') out.push(node)
    else flatten(node.children, out)
  }
  return out
}

export function QuickOpen() {
  const { state, actions } = useEditor()

  const items = useMemo<OverlayItem[]>(() => {
    const fromFolder: OverlayItem[] = flatten(state.tree).map((node) => ({
      id: `file:${node.path}`,
      label: node.name,
      detail: node.path,
      run: () => void actions.openTreePath(node.path),
    }))

    if (fromFolder.length > 0) return fromFolder

    // No folder open: fall back to switching between tabs that are already loaded.
    const fromTabs: OverlayItem[] = state.tabs.map((tab) => ({
      id: `tab:${tab.id}`,
      label: tab.name,
      detail: tab.path ?? 'open tab',
      run: () => actions.activateTab(tab.id),
    }))

    return [
      ...fromTabs,
      {
        id: 'action:openFolder',
        label: 'Open Folder\u2026',
        detail: 'no folder is open',
        hint: 'Ctrl+Shift+O',
        run: () => void actions.openFolder(),
      },
    ]
  }, [actions, state.tabs, state.tree])

  if (!state.quickOpenOpen) return null

  return (
    <Overlay
      title="Quick open"
      placeholder={state.rootHandle ? 'Search files by name\u2026' : 'Switch to an open tab\u2026'}
      items={items}
      emptyText="No matching files."
      onClose={() => actions.setQuickOpen(false)}
    />
  )
}
