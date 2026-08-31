import type { EditorActions } from './state/EditorContext'
import type { Settings } from './state/types'

export interface Command {
  id: string
  label: string
  hint?: string
  run(): void
}

/**
 * Every action reachable from the command palette.
 *
 * Labels are written as "Group: Action" so the fuzzy filter can find a command
 * from either half ("save", "file save", "wrap").
 */
export function buildCommands(actions: EditorActions, settings: Settings): Command[] {
  const fontSize = settings.fontSize

  return [
    { id: 'file.new', label: 'File: New File', hint: 'Ctrl+N', run: actions.newFile },
    { id: 'file.open', label: 'File: Open File\u2026', hint: 'Ctrl+O', run: () => void actions.openFiles() },
    {
      id: 'file.openFolder',
      label: 'File: Open Folder\u2026',
      hint: 'Ctrl+Shift+O',
      run: () => void actions.openFolder(),
    },
    { id: 'file.save', label: 'File: Save', hint: 'Ctrl+S', run: () => void actions.save() },
    { id: 'file.saveAs', label: 'File: Save As\u2026', hint: 'Ctrl+Shift+S', run: () => void actions.saveAs() },
    { id: 'file.saveAll', label: 'File: Save All', run: () => void actions.saveAll() },
    { id: 'file.closeFolder', label: 'File: Close Folder', run: actions.closeFolder },

    { id: 'tab.close', label: 'Tab: Close Current', run: actions.closeActiveTab },
    { id: 'tab.revert', label: 'Tab: Revert to Saved', run: actions.revertActiveTab },

    {
      id: 'view.sidebar',
      label: `View: ${settings.showSidebar ? 'Hide' : 'Show'} Explorer`,
      hint: 'Ctrl+B',
      run: actions.toggleSidebar,
    },
    {
      id: 'view.preview',
      label: `View: ${settings.showPreview ? 'Hide' : 'Show'} Markdown Preview`,
      hint: 'Ctrl+Shift+V',
      run: actions.togglePreview,
    },
    {
      id: 'view.wrap',
      label: `View: Word Wrap ${settings.wordWrap ? 'Off' : 'On'}`,
      run: () => actions.updateSettings({ wordWrap: !settings.wordWrap }),
    },
    {
      id: 'view.whitespace',
      label: `View: Whitespace Characters ${settings.showWhitespace ? 'Off' : 'On'}`,
      run: () => actions.updateSettings({ showWhitespace: !settings.showWhitespace }),
    },
    {
      id: 'view.lineNumbers',
      label: `View: Line Numbers ${settings.lineNumbers ? 'Off' : 'On'}`,
      run: () => actions.updateSettings({ lineNumbers: !settings.lineNumbers }),
    },
    {
      id: 'view.theme',
      label: `View: Switch to ${settings.theme === 'dark' ? 'Light' : 'Dark'} Theme`,
      run: () => actions.updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' }),
    },
    {
      id: 'view.fontBigger',
      label: 'View: Increase Font Size',
      hint: 'Ctrl+=',
      run: () => actions.updateSettings({ fontSize: Math.min(32, fontSize + 1) }),
    },
    {
      id: 'view.fontSmaller',
      label: 'View: Decrease Font Size',
      hint: 'Ctrl+-',
      run: () => actions.updateSettings({ fontSize: Math.max(10, fontSize - 1) }),
    },
    {
      id: 'view.fontReset',
      label: 'View: Reset Font Size',
      run: () => actions.updateSettings({ fontSize: 14 }),
    },

    {
      id: 'indent.2',
      label: 'Editor: Indent Using 2 Spaces',
      run: () => actions.updateSettings({ tabSize: 2 }),
    },
    {
      id: 'indent.4',
      label: 'Editor: Indent Using 4 Spaces',
      run: () => actions.updateSettings({ tabSize: 4 }),
    },

    {
      id: 'go.file',
      label: 'Go to File\u2026',
      hint: 'Ctrl+P',
      run: () => actions.setQuickOpen(true),
    },
    { id: 'session.clear', label: 'Session: Clear Saved Session', run: actions.resetSession },
  ]
}
