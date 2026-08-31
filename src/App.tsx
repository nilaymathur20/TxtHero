import { useEffect } from 'react'
import { EditorProvider, useEditor } from './state/EditorContext'
import { TitleBar } from './components/TitleBar'
import { Sidebar } from './components/Sidebar'
import { TabBar } from './components/TabBar'
import { EditorPane } from './components/EditorPane'
import { StatusBar } from './components/StatusBar'
import { Welcome } from './components/Welcome'
import { Notice } from './components/Notice'
import { CommandPalette } from './components/CommandPalette'
import { QuickOpen } from './components/QuickOpen'
import { isDirty } from './state/reducer'

function Shell() {
  const { state, actions, activeTab } = useEditor()
  const { theme, showSidebar, fontSize } = state.settings

  // Theme + font size are exposed as CSS custom properties so the editor,
  // overlays and chrome all move together.
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.setProperty('--font-size', `${fontSize}px`)
  }, [theme, fontSize])

  const dirty = activeTab ? isDirty(activeTab) : false

  useEffect(() => {
    document.title = activeTab ? `${dirty ? '\u2022 ' : ''}${activeTab.name} \u2014 TxtHero` : 'TxtHero'
  }, [activeTab?.name, dirty])

  // Warn before closing with unsaved work.
  useEffect(() => {
    const hasUnsaved = state.tabs.some(isDirty)
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsaved) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [state.tabs])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return
      const key = event.key.toLowerCase()
      const shift = event.shiftKey
      const take = (fn: () => void) => {
        event.preventDefault()
        fn()
      }

      if (key === 's') return take(() => void (shift ? actions.saveAs() : actions.save()))
      if (key === 'o') return take(() => void (shift ? actions.openFolder() : actions.openFiles()))
      if (key === 'n' && !shift) return take(actions.newFile)
      if (key === 'p') return take(() => actions.setQuickOpen(!shift))
      if (key === 'k') return take(() => actions.setPalette(true))
      if (key === 'b') return take(actions.toggleSidebar)
      if (key === 'v' && shift) return take(actions.togglePreview)
      if (key === 'w') return take(actions.closeActiveTab)
      if (key === '=' || key === '+') {
        return take(() => actions.updateSettings({ fontSize: Math.min(32, fontSize + 1) }))
      }
      if (key === '-' || key === '_') {
        return take(() => actions.updateSettings({ fontSize: Math.max(10, fontSize - 1) }))
      }
      if (key === '0') return take(() => actions.updateSettings({ fontSize: 14 }))
      return undefined
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [actions, fontSize])

  return (
    <div className="app">
      <TitleBar />
      <div className="workspace">
        {showSidebar && <Sidebar />}
        <div className="main">
          <TabBar />
          {state.tabs.length === 0 ? <Welcome /> : <EditorPane />}
        </div>
      </div>
      <StatusBar />
      <Notice />
      <CommandPalette />
      <QuickOpen />
    </div>
  )
}

export default function App() {
  return (
    <EditorProvider>
      <Shell />
    </EditorProvider>
  )
}
