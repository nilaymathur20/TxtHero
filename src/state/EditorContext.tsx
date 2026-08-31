import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react'
import {
  initialState,
  isDirty,
  makeNotice,
  reducer,
  type EditorState,
  type NewTabInput,
} from './reducer'
import { DEFAULT_SETTINGS, type NoticeKind, type Settings, type Tab, type TabCursor } from './types'
import { detectLanguage, type LanguageId } from '../lib/languages'
import {
  downloadFile,
  pickDirectory,
  pickFiles,
  pickSaveLocation,
  readHandle,
  readTree,
  resolveNode,
  supportsFileSystemAccess,
  uploadFiles,
  writeHandle,
} from '../lib/files'
import { loadSession, saveSession, shouldPersist } from '../lib/persist'

export interface EditorActions {
  newFile(): void
  openFiles(): Promise<void>
  openFolder(): Promise<void>
  closeFolder(): void
  openTreePath(path: string): Promise<void>
  save(): Promise<void>
  saveAs(): Promise<void>
  saveAll(): Promise<void>
  activateTab(id: string): void
  closeTab(id: string): void
  closeActiveTab(): void
  setContent(id: string, content: string): void
  setViewport(id: string, cursor: TabCursor, scroll: number): void
  setLanguage(id: string, languageId: LanguageId): void
  rename(id: string, name: string): void
  revertActiveTab(): void
  updateSettings(patch: Partial<Settings>): void
  toggleSidebar(): void
  togglePreview(): void
  setPalette(open: boolean): void
  setQuickOpen(open: boolean): void
  notify(kind: NoticeKind, text: string): void
  dismissNotice(): void
  resetSession(): void
}

interface EditorContextValue {
  state: EditorState
  actions: EditorActions
  activeTab: Tab | null
}

const EditorContext = createContext<EditorContextValue | null>(null)

export function EditorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const stateRef = useRef(state)
  stateRef.current = state

  const noticeTimer = useRef<number | null>(null)
  const persistTimer = useRef<number | null>(null)
  const restored = useRef(false)

  const notify = useCallback((kind: NoticeKind, text: string) => {
    dispatch({ type: 'notice/set', notice: makeNotice(kind, text) })
    if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => {
      dispatch({ type: 'notice/set', notice: null })
      noticeTimer.current = null
    }, kind === 'error' ? 6000 : 3200)
  }, [])

  const fail = useCallback(
    (error: unknown, context: string) => {
      const message = error instanceof Error ? error.message : String(error)
      notify('error', `${context}: ${message}`)
    },
    [notify],
  )

  /* ---------------------------------------------------------------- session */

  useEffect(() => {
    if (restored.current) return
    restored.current = true

    const session = loadSession()
    if (!session) return

    const tabs: Tab[] = session.tabs.map((tab) => ({
      id: tab.id,
      name: tab.name,
      path: tab.path,
      content: tab.content,
      // Restored without a file handle, so everything counts as unsaved work.
      savedContent: '',
      handle: null,
      languageId: tab.languageId,
      rev: 0,
      cursor: { anchor: 0, head: 0 },
      scroll: 0,
    }))

    if (tabs.length === 0) return
    const activeTabId = tabs.some((tab) => tab.id === session.activeTabId) ? session.activeTabId : tabs[0].id
    dispatch({ type: 'session/restore', tabs, activeTabId, settings: { ...DEFAULT_SETTINGS, ...session.settings } })
  }, [])

  useEffect(() => {
    if (persistTimer.current !== null) window.clearTimeout(persistTimer.current)
    persistTimer.current = window.setTimeout(() => {
      saveSession({
        version: 1,
        activeTabId: stateRef.current.activeTabId,
        tabs: stateRef.current.tabs
          .filter((tab) => shouldPersist(tab.content))
          .map((tab) => ({
            id: tab.id,
            name: tab.name,
            path: tab.path,
            content: tab.content,
            languageId: tab.languageId,
          })),
        settings: stateRef.current.settings,
        savedAt: Date.now(),
      })
    }, 400)

    return () => {
      if (persistTimer.current !== null) window.clearTimeout(persistTimer.current)
    }
  }, [state.tabs, state.activeTabId, state.settings])

  /* -------------------------------------------------------------- tab maths */

  const addOrActivate = useCallback(
    (inputs: NewTabInput[]) => {
      const current = stateRef.current
      const fresh: NewTabInput[] = []

      for (const input of inputs) {
        const existing = current.tabs.find(
          (tab) => (input.handle !== null && tab.handle === input.handle) || (input.path !== null && tab.path === input.path),
        )
        if (existing) {
          dispatch({ type: 'tabs/activate', id: existing.id })
        } else {
          fresh.push(input)
        }
      }

      if (fresh.length > 0) dispatch({ type: 'tabs/add', tabs: fresh })
      if (fresh.length > 1) notify('info', `Opened ${fresh.length} files`)
    },
    [notify],
  )

  const newFile = useCallback(() => {
    const used = new Set(stateRef.current.tabs.map((tab) => tab.name))
    let index = 1
    let name = 'untitled.txt'
    while (used.has(name)) {
      index += 1
      name = `untitled-${index}.txt`
    }
    dispatch({ type: 'tabs/new', name })
  }, [])

  const openFiles = useCallback(async () => {
    try {
      if (supportsFileSystemAccess()) {
        const handles = await pickFiles()
        if (handles.length === 0) return
        const inputs: NewTabInput[] = []
        for (const handle of handles) {
          const content = await readHandle(handle)
          inputs.push({
            name: handle.name,
            content,
            path: null,
            handle,
            languageId: detectLanguage(handle.name),
          })
        }
        addOrActivate(inputs)
        return
      }

      const opened = await uploadFiles()
      addOrActivate(
        opened.map((file) => ({
          name: file.name,
          content: file.content,
          path: file.path,
          handle: null,
          languageId: detectLanguage(file.name),
        })),
      )
    } catch (error) {
      fail(error, 'Could not open file')
    }
  }, [addOrActivate, fail])

  const openFolder = useCallback(async () => {
    try {
      const root = await pickDirectory()
      if (!root) return
      dispatch({ type: 'tree/load' })
      const tree = await readTree(root)
      dispatch({ type: 'tree/set', rootName: root.name, rootHandle: root, tree })
      notify('success', `Opened folder “${root.name}”`)
    } catch (error) {
      dispatch({ type: 'tree/clear' })
      fail(error, 'Could not open folder')
    }
  }, [fail, notify])

  const closeFolder = useCallback(() => {
    dispatch({ type: 'tree/clear' })
  }, [])

  const openTreePath = useCallback(
    async (path: string) => {
      const root = stateRef.current.rootHandle
      if (!root) {
        notify('error', 'No folder is open.')
        return
      }
      try {
        const handle = await resolveNode(root, path)
        const content = await readHandle(handle)
        addOrActivate([
          {
            name: handle.name,
            content,
            path,
            handle,
            languageId: detectLanguage(handle.name),
          },
        ])
      } catch (error) {
        fail(error, `Could not open “${path}”`)
      }
    },
    [addOrActivate, fail, notify],
  )

  /* ------------------------------------------------------------------- save */

  const writeTab = useCallback(
    async (tab: Tab): Promise<boolean> => {
      if (tab.handle) {
        await writeHandle(tab.handle, tab.content)
        dispatch({
          type: 'tabs/saved',
          id: tab.id,
          content: tab.content,
          name: tab.handle.name,
          path: tab.path,
          handle: tab.handle,
        })
        return true
      }
      return false
    },
    [],
  )

  const save = useCallback(async () => {
    const tab = stateRef.current.tabs.find((candidate) => candidate.id === stateRef.current.activeTabId)
    if (!tab) {
      notify('info', 'Nothing open to save.')
      return
    }
    if (!isDirty(tab) && tab.handle) {
      notify('info', `“${tab.name}” is already saved.`)
      return
    }
    try {
      if (await writeTab(tab)) {
        notify('success', `Saved “${tab.name}”`)
        return
      }

      // No handle yet: pick a location, or fall back to a plain download.
      const target = await pickSaveLocation(tab.name)
      if (target) {
        await writeHandle(target, tab.content)
        dispatch({
          type: 'tabs/saved',
          id: tab.id,
          content: tab.content,
          name: target.name,
          path: null,
          handle: target,
        })
        notify('success', `Saved “${target.name}”`)
        return
      }

      if (!supportsFileSystemAccess()) {
        downloadFile(tab.name, tab.content)
        dispatch({
          type: 'tabs/saved',
          id: tab.id,
          content: tab.content,
          name: tab.name,
          path: tab.path,
          handle: null,
        })
        notify('success', `Downloaded “${tab.name}”`)
      }
    } catch (error) {
      fail(error, 'Could not save file')
    }
  }, [fail, notify, writeTab])

  const saveAs = useCallback(async () => {
    const tab = stateRef.current.tabs.find((candidate) => candidate.id === stateRef.current.activeTabId)
    if (!tab) return

    const name = window.prompt('Save as:', tab.name)
    if (name === null) return
    const trimmed = name.trim()
    if (trimmed.length === 0) {
      notify('error', 'File name cannot be empty.')
      return
    }

    try {
      const target = await pickSaveLocation(trimmed)
      if (target) {
        await writeHandle(target, tab.content)
        dispatch({
          type: 'tabs/saved',
          id: tab.id,
          content: tab.content,
          name: target.name,
          path: null,
          handle: target,
        })
        notify('success', `Saved “${target.name}”`)
        return
      }

      downloadFile(trimmed, tab.content)
      dispatch({
        type: 'tabs/rename',
        id: tab.id,
        name: trimmed,
        languageId: detectLanguage(trimmed),
      })
      notify('success', `Downloaded “${trimmed}”`)
    } catch (error) {
      fail(error, 'Could not save file')
    }
  }, [fail, notify])

  const saveAll = useCallback(async () => {
    const dirty = stateRef.current.tabs.filter((tab) => isDirty(tab) && tab.handle)
    if (dirty.length === 0) {
      notify('info', 'No open files to save.')
      return
    }
    let saved = 0
    for (const tab of dirty) {
      try {
        if (await writeTab(tab)) saved += 1
      } catch (error) {
        fail(error, `Could not save “${tab.name}”`)
      }
    }
    if (saved > 0) notify('success', `Saved ${saved} file${saved === 1 ? '' : 's'}`)
  }, [fail, notify, writeTab])

  /* ------------------------------------------------------------------- tabs */

  const activateTab = useCallback((id: string) => dispatch({ type: 'tabs/activate', id }), [])

  const closeTab = useCallback((id: string) => {
    const tab = stateRef.current.tabs.find((candidate) => candidate.id === id)
    if (!tab) return
    if (isDirty(tab)) {
      const confirmed = window.confirm(`“${tab.name}” has unsaved changes. Close it anyway?`)
      if (!confirmed) return
    }
    dispatch({ type: 'tabs/close', id })
  }, [])

  const closeActiveTab = useCallback(() => {
    const id = stateRef.current.activeTabId
    if (id) closeTab(id)
  }, [closeTab])

  const setContent = useCallback((id: string, content: string) => dispatch({ type: 'tabs/content', id, content }), [])

  const setViewport = useCallback(
    (id: string, cursor: TabCursor, scroll: number) => dispatch({ type: 'tabs/viewport', id, cursor, scroll }),
    [],
  )

  const setLanguage = useCallback(
    (id: string, languageId: LanguageId) => dispatch({ type: 'tabs/language', id, languageId }),
    [],
  )

  const rename = useCallback(
    (id: string, name: string) => {
      const trimmed = name.trim()
      if (!trimmed) return
      dispatch({ type: 'tabs/rename', id, name: trimmed, languageId: detectLanguage(trimmed) })
    },
    [],
  )

  const revertActiveTab = useCallback(() => {
    const tab = stateRef.current.tabs.find((candidate) => candidate.id === stateRef.current.activeTabId)
    if (!tab) return
    if (!isDirty(tab)) {
      notify('info', 'No unsaved changes to revert.')
      return
    }
    if (!window.confirm(`Discard unsaved changes to “${tab.name}”?`)) return
    dispatch({ type: 'tabs/replace', id: tab.id, content: tab.savedContent })
    notify('success', `Reverted “${tab.name}”`)
  }, [notify])

  /* --------------------------------------------------------------- settings */

  const updateSettings = useCallback((patch: Partial<Settings>) => dispatch({ type: 'settings/set', patch }), [])

  const toggleSidebar = useCallback(
    () => dispatch({ type: 'settings/set', patch: { showSidebar: !stateRef.current.settings.showSidebar } }),
    [],
  )

  const togglePreview = useCallback(
    () => dispatch({ type: 'settings/set', patch: { showPreview: !stateRef.current.settings.showPreview } }),
    [],
  )

  const setPalette = useCallback((open: boolean) => dispatch({ type: 'ui/palette', open }), [])
  const setQuickOpen = useCallback((open: boolean) => dispatch({ type: 'ui/quickOpen', open }), [])

  const dismissNotice = useCallback(() => dispatch({ type: 'notice/set', notice: null }), [])

  const resetSession = useCallback(() => {
    const confirmed = window.confirm('Close every tab and clear the saved session?')
    if (!confirmed) return
    dispatch({ type: 'session/restore', tabs: [], activeTabId: null, settings: DEFAULT_SETTINGS })
    notify('success', 'Session cleared.')
  }, [notify])

  const actions = useMemo<EditorActions>(
    () => ({
      newFile,
      openFiles,
      openFolder,
      closeFolder,
      openTreePath,
      save,
      saveAs,
      saveAll,
      activateTab,
      closeTab,
      closeActiveTab,
      setContent,
      setViewport,
      setLanguage,
      rename,
      revertActiveTab,
      updateSettings,
      toggleSidebar,
      togglePreview,
      setPalette,
      setQuickOpen,
      notify,
      dismissNotice,
      resetSession,
    }),
    [
      activateTab,
      closeActiveTab,
      closeFolder,
      closeTab,
      dismissNotice,
      newFile,
      notify,
      openFiles,
      openFolder,
      openTreePath,
      rename,
      resetSession,
      revertActiveTab,
      save,
      saveAll,
      saveAs,
      setContent,
      setLanguage,
      setPalette,
      setQuickOpen,
      setViewport,
      togglePreview,
      toggleSidebar,
      updateSettings,
    ],
  )

  const activeTab = useMemo(
    () => state.tabs.find((tab) => tab.id === state.activeTabId) ?? null,
    [state.tabs, state.activeTabId],
  )

  const value = useMemo<EditorContextValue>(() => ({ state, actions, activeTab }), [state, actions, activeTab])

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
}

export function useEditor(): EditorContextValue {
  const context = useContext(EditorContext)
  if (!context) throw new Error('useEditor must be used inside <EditorProvider>')
  return context
}
