import { useMemo } from 'react'
import { Overlay, type OverlayItem } from './Overlay'
import { buildCommands } from '../commands'
import { useEditor } from '../state/EditorContext'

export function CommandPalette() {
  const { state, actions } = useEditor()

  const items = useMemo<OverlayItem[]>(
    () => buildCommands(actions, state.settings).map((command) => ({ ...command })),
    [actions, state.settings],
  )

  if (!state.paletteOpen) return null

  return (
    <Overlay
      title="Command palette"
      placeholder={'Type a command\u2026'}
      items={items}
      emptyText="No matching commands."
      onClose={() => actions.setPalette(false)}
    />
  )
}
