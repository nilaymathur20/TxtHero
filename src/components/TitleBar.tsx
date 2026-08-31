import { useEditor } from '../state/EditorContext'
import { isDirty } from '../state/reducer'

export function TitleBar() {
  const { state, actions, activeTab } = useEditor()
  const dirty = activeTab ? isDirty(activeTab) : false

  return (
    <header className="titlebar">
      <div className="brand" aria-label="TxtHero">
        <span className="brand-txt">Txt</span>
        <span className="brand-hero">Hero</span>
      </div>

      <div className="titlebar-actions" role="toolbar" aria-label="File actions">
        <button type="button" className="tb-btn" onClick={actions.newFile} title="New file (Ctrl+N)">
          New
        </button>
        <button type="button" className="tb-btn" onClick={() => void actions.openFiles()} title="Open file (Ctrl+O)">
          Open
        </button>
        <button
          type="button"
          className="tb-btn"
          onClick={() => void actions.openFolder()}
          title="Open folder (Ctrl+Shift+O)"
        >
          Folder
        </button>
        <button
          type="button"
          className="tb-btn"
          onClick={() => void actions.save()}
          title="Save (Ctrl+S)"
          disabled={!activeTab}
        >
          Save
        </button>
        <button
          type="button"
          className="tb-btn"
          onClick={() => void actions.saveAll()}
          title="Save all open files"
        >
          Save All
        </button>
      </div>

      <div className="titlebar-spacer" />

      <div className="titlebar-actions" role="toolbar" aria-label="View actions">
        <button
          type="button"
          className={`tb-btn${state.settings.showSidebar ? ' is-on' : ''}`}
          onClick={actions.toggleSidebar}
          title="Toggle explorer (Ctrl+B)"
        >
          Explorer
        </button>
        <button
          type="button"
          className={`tb-btn${state.settings.showPreview ? ' is-on' : ''}`}
          onClick={actions.togglePreview}
          title="Toggle markdown preview (Ctrl+Shift+V)"
        >
          Preview
        </button>
        <button
          type="button"
          className="tb-btn"
          onClick={() => actions.updateSettings({ wordWrap: !state.settings.wordWrap })}
          title="Toggle word wrap"
        >
          Wrap
        </button>
        <button
          type="button"
          className="tb-btn"
          onClick={() =>
            actions.updateSettings({ theme: state.settings.theme === 'dark' ? 'light' : 'dark' })
          }
          title="Switch theme"
        >
          {state.settings.theme === 'dark' ? 'Light' : 'Dark'}
        </button>
        <button
          type="button"
          className="tb-btn is-accent"
          onClick={() => actions.setPalette(true)}
          title="Command palette (Ctrl+K)"
        >
          Commands
        </button>
      </div>

      <div className="titlebar-status">
        {activeTab ? (
          <span className={`doc-state${dirty ? ' is-dirty' : ''}`}>
            {dirty ? 'Unsaved changes' : 'All changes saved'}
          </span>
        ) : (
          <span className="doc-state">No file open</span>
        )}
      </div>
    </header>
  )
}
