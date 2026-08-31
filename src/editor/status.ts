import { createStore } from '../lib/store'

/**
 * Cursor/selection/document statistics, updated on every keystroke.
 *
 * Deliberately outside React state: only the status bar reads this, so typing
 * in a large file re-renders one small component instead of the whole shell.
 */
export interface EditorStatus {
  line: number
  col: number
  selectionChars: number
  selectionLines: number
  lines: number
  chars: number
  words: number
}

export const EMPTY_STATUS: EditorStatus = {
  line: 1,
  col: 1,
  selectionChars: 0,
  selectionLines: 0,
  lines: 1,
  chars: 0,
  words: 0,
}

export const editorStatus = createStore<EditorStatus>(EMPTY_STATUS)
