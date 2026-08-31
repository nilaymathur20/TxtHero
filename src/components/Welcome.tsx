import { useEditor } from '../state/EditorContext'
import { supportsFileSystemAccess } from '../lib/files'

const SHORTCUTS: Array<[string, string]> = [
  ['Ctrl / \u2318 + N', 'New file'],
  ['Ctrl / \u2318 + O', 'Open file'],
  ['Ctrl / \u2318 + Shift + O', 'Open folder'],
  ['Ctrl / \u2318 + S', 'Save'],
  ['Ctrl / \u2318 + P', 'Quick open'],
  ['Ctrl / \u2318 + K', 'Command palette'],
  ['Ctrl / \u2318 + F', 'Find and replace'],
  ['Ctrl / \u2318 + Shift + V', 'Markdown preview'],
  ['Ctrl / \u2318 + B', 'Toggle explorer'],
]

export function Welcome() {
  const { actions } = useEditor()

  return (
    <div className="welcome">
      <div className="welcome-mark" aria-hidden="true">
        <span>Txt</span>
        <em>Hero</em>
      </div>
      <h1>Start writing.</h1>
      <p className="welcome-sub">
        A keyboard-first text editor that runs entirely in your browser. Nothing is uploaded —
        {supportsFileSystemAccess()
          ? ' files are read from and written back to your disk directly.'
          : ' this browser has no direct disk access, so saving downloads a copy.'}
      </p>

      <div className="welcome-actions">
        <button type="button" className="btn is-primary" onClick={actions.newFile}>
          New File
        </button>
        <button type="button" className="btn" onClick={() => void actions.openFiles()}>
          Open File
        </button>
        <button type="button" className="btn" onClick={() => void actions.openFolder()}>
          Open Folder
        </button>
      </div>

      <dl className="welcome-keys">
        {SHORTCUTS.map(([keys, label]) => (
          <div key={keys} className="welcome-key">
            <dt>
              <kbd>{keys}</kbd>
            </dt>
            <dd>{label}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
