import { useStore } from '../lib/store'
import { editorStatus } from '../editor/status'
import { useEditor } from '../state/EditorContext'
import { isDirty } from '../state/reducer'
import { byteLength, formatBytes } from '../lib/format'
import { LANGUAGES, type LanguageId } from '../lib/languages'
import { supportsFileSystemAccess } from '../lib/files'

export function StatusBar() {
  const { state, actions, activeTab } = useEditor()
  const status = useStore(editorStatus)
  const canWriteDirectly = supportsFileSystemAccess()

  return (
    <footer className="statusbar">
      <div className="status-left">
        <span className="status-item" title="Folder">
          {state.rootName ?? 'no folder'}
        </span>
        {activeTab && (
          <>
            <span className="status-item">
              Ln {status.line}, Col {status.col}
            </span>
            {status.selectionChars > 0 && (
              <span className="status-item is-accent">
                {status.selectionChars} sel
                {status.selectionLines > 1 ? ` (${status.selectionLines} lines)` : ''}
              </span>
            )}
            <span className="status-item">
              {status.words === -1 ? '\u2014' : status.words} words
            </span>
            <span className="status-item">{status.lines} lines</span>
            <span className="status-item">{formatBytes(byteLength(activeTab.content))}</span>
          </>
        )}
      </div>

      <div className="status-right">
        {activeTab && (
          <select
            className="status-select"
            value={activeTab.languageId}
            title="Language mode"
            aria-label="Language mode"
            onChange={(event) => actions.setLanguage(activeTab.id, event.target.value as LanguageId)}
          >
            {LANGUAGES.map((language) => (
              <option key={language.id} value={language.id}>
                {language.label}
              </option>
            ))}
          </select>
        )}
        <span className="status-item" title="Tab size">
          Spaces: {state.settings.tabSize}
        </span>
        <span className="status-item">UTF-8</span>
        <span className={`status-item${activeTab && isDirty(activeTab) ? ' is-accent' : ''}`}>
          {activeTab ? (isDirty(activeTab) ? 'Unsaved' : 'Saved') : '\u2014'}
        </span>
        <span
          className="status-item is-muted"
          title={canWriteDirectly ? 'Direct disk writes supported' : 'This browser saves via download'}
        >
          {canWriteDirectly ? 'FS API' : 'Download'}
        </span>
      </div>
    </footer>
  )
}
