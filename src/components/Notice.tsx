import { useEditor } from '../state/EditorContext'

export function Notice() {
  const { state, actions } = useEditor()
  if (!state.notice) return null

  return (
    <div
      className={`notice is-${state.notice.kind}`}
      role="status"
      aria-live="polite"
      onClick={actions.dismissNotice}
    >
      <span className="notice-dot" aria-hidden="true" />
      <span>{state.notice.text}</span>
    </div>
  )
}
