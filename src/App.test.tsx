import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

/**
 * Mounts the real <App /> — provider, shell, CodeMirror and all — so these
 * catch wiring mistakes (bad context usage, a component that throws on first
 * render, a shortcut bound to the wrong action) that unit tests cannot see.
 */

beforeEach(() => {
  localStorage.clear()
  document.documentElement.dataset.theme = ''
  document.documentElement.style.removeProperty('--font-size')
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

/** The title bar button, which is present whether or not a file is open. */
const titlebarNew = () => screen.getByRole('button', { name: 'New' })
/** The welcome screen's own button, only present when nothing is open. */
const welcomeNewFile = () => screen.getByRole('button', { name: 'New File' })

function closeTab(name: RegExp) {
  const tab = screen.getByRole('tab', { name })
  fireEvent.click(within(tab as HTMLElement).getByRole('button'))
}

describe('first launch', () => {
  it('renders the shell and the welcome screen', () => {
    render(<App />)

    expect(within(screen.getByRole('banner')).getByText('Txt')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /start writing/i })).toBeInTheDocument()
    expect(welcomeNewFile()).toBeInTheDocument()
    expect(screen.getByText(/keyboard-first text editor/i)).toBeInTheDocument()
    // No editor is mounted until something is open.
    expect(document.querySelector('.cm-editor')).toBeNull()
  })

  it('reports that no folder and no file are open', () => {
    render(<App />)
    expect(screen.getByText('no folder')).toBeInTheDocument()
    expect(screen.getByText('No file open')).toBeInTheDocument()
  })
})

describe('opening and closing files', () => {
  it('creates a tab and mounts the editor', async () => {
    render(<App />)

    await userEvent.click(welcomeNewFile())

    expect(screen.getByRole('tab', { name: /untitled\.txt/ })).toBeInTheDocument()
    expect(document.querySelector('.cm-editor')).not.toBeNull()
    expect(screen.queryByRole('heading', { name: /start writing/i })).toBeNull()
    expect(screen.getByText('All changes saved')).toBeInTheDocument()
  })

  it('gives successive untitled files distinct names', async () => {
    render(<App />)

    await userEvent.click(titlebarNew())
    await userEvent.click(titlebarNew())

    expect(screen.getByRole('tab', { name: /untitled\.txt/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /untitled-2\.txt/ })).toBeInTheDocument()
  })

  it('returns to the welcome screen when the last tab closes', async () => {
    render(<App />)
    await userEvent.click(titlebarNew())
    expect(screen.getByRole('tab', { name: /untitled\.txt/ })).toBeInTheDocument()

    closeTab(/untitled\.txt/)

    expect(screen.getByRole('heading', { name: /start writing/i })).toBeInTheDocument()
    expect(document.querySelector('.cm-editor')).toBeNull()
  })
})

describe('view controls', () => {
  it('toggles the theme on the document element', async () => {
    render(<App />)
    const user = userEvent.setup()

    // The button is labelled with the theme it will switch *to*, so a dark
    // editor shows "Light".
    await user.click(screen.getByRole('button', { name: 'Light' }))
    expect(document.documentElement.dataset.theme).toBe('light')

    await user.click(screen.getByRole('button', { name: 'Dark' }))
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('toggles the explorer sidebar', async () => {
    render(<App />)
    const user = userEvent.setup()
    expect(screen.getByRole('complementary', { name: /file explorer/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^explorer$/i }))
    expect(screen.queryByRole('complementary', { name: /file explorer/i })).toBeNull()
  })

  it('sets the font size custom property', async () => {
    render(<App />)
    const user = userEvent.setup()
    await user.click(titlebarNew())

    await user.keyboard('{Control>}={/Control}')
    expect(document.documentElement.style.getPropertyValue('--font-size')).toBe('15px')

    await user.keyboard('{Control>}-{/Control}')
    await user.keyboard('{Control>}-{/Control}')
    expect(document.documentElement.style.getPropertyValue('--font-size')).toBe('13px')
  })

  it('updates the document title to the open file', async () => {
    render(<App />)
    await userEvent.click(titlebarNew())
    expect(document.title).toContain('untitled.txt')
    expect(document.title).toContain('TxtHero')
  })
})

describe('command palette', () => {
  it('opens with the shortcut and closes on Escape', async () => {
    render(<App />)
    const user = userEvent.setup()

    await user.keyboard('{Control>}k{/Control}')
    expect(screen.getByRole('dialog', { name: /command palette/i })).toBeInTheDocument()
    expect(screen.getByText('File: Save')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: /command palette/i })).toBeNull()
  })

  it('filters commands and runs the selected one', async () => {
    render(<App />)
    const user = userEvent.setup()

    await user.keyboard('{Control>}k{/Control}')
    await user.type(screen.getByRole('textbox', { name: /command palette/i }), 'markdown')

    expect(screen.getByText(/Show Markdown Preview/)).toBeInTheDocument()
    expect(screen.queryByText('File: Save')).toBeNull()

    await user.keyboard('{Enter}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('button', { name: /^preview$/i })).toHaveClass('is-on')
  })

  it('quick open offers to open a folder when none is open', async () => {
    render(<App />)
    const user = userEvent.setup()

    await user.keyboard('{Control>}p{/Control}')
    const dialog = screen.getByRole('dialog', { name: /quick open/i })
    // Scoped to the dialog: the sidebar has its own "Open Folder" button.
    expect(within(dialog).getByText(/Open Folder/)).toBeInTheDocument()
  })
})

describe('keyboard shortcuts', () => {
  it('Ctrl+N creates a file', async () => {
    render(<App />)
    const user = userEvent.setup()

    await user.keyboard('{Control>}n{/Control}')
    expect(screen.getByRole('tab', { name: /untitled\.txt/ })).toBeInTheDocument()
  })

  it('closing a tab with its button removes it and keeps the rest', async () => {
    render(<App />)
    const user = userEvent.setup()
    await user.click(titlebarNew())
    await user.click(titlebarNew())

    closeTab(/untitled-2\.txt/)

    expect(screen.queryByRole('tab', { name: /untitled-2\.txt/ })).toBeNull()
    expect(screen.getByRole('tab', { name: /untitled\.txt/ })).toBeInTheDocument()
  })
})
