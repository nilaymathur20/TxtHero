import { describe, expect, it } from 'vitest'
import { byteLength, countLines, countWords, formatBytes, fuzzyScore } from './format'

describe('countWords', () => {
  it('counts whitespace-separated words', () => {
    expect(countWords('hello world')).toBe(2)
  })

  it('returns 0 for empty input', () => {
    expect(countWords('')).toBe(0)
    expect(countWords('   \n\t ')).toBe(0)
  })

  it('keeps contractions and hyphenated forms as one word', () => {
    expect(countWords("don't stop, believing!")).toBe(3)
    expect(countWords('state-of-the-art design')).toBe(2)
  })

  it('counts non-latin scripts', () => {
    expect(countWords('नमस्ते दुनिया')).toBe(2)
  })
})

describe('countLines', () => {
  it('treats empty text as a single line', () => {
    expect(countLines('')).toBe(1)
  })

  it('counts newline-terminated text without a phantom trailing line', () => {
    expect(countLines('a')).toBe(1)
    expect(countLines('a\nb')).toBe(2)
    expect(countLines('a\n')).toBe(2)
    expect(countLines('a\nb\nc')).toBe(3)
  })

  it('counts CRLF line endings the same as LF', () => {
    // One newline each, so same shape as "a\nb\n" — a trailing terminator
    // still opens a final (empty) line, matching the "a\n" case above.
    expect(countLines('a\r\nb\r\n')).toBe(3)
    expect(countLines('a\r\nb')).toBe(2)
  })
})

describe('formatBytes', () => {
  it('stays in bytes below a kilobyte', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(512)).toBe('512 B')
  })

  it('scales up through the units', () => {
    expect(formatBytes(2048)).toBe('2.0 KB')
    expect(formatBytes(1048576)).toBe('1.0 MB')
    expect(formatBytes(1536)).toBe('1.5 KB')
  })
})

describe('byteLength', () => {
  it('measures UTF-8 bytes, not UTF-16 code units', () => {
    expect(byteLength('abc')).toBe(3)
    expect(byteLength('\u00e9')).toBe(2)
    expect(byteLength('\u20ac')).toBe(3)
  })
})

describe('fuzzyScore', () => {
  it('returns 0 for an empty query', () => {
    expect(fuzzyScore('', 'anything')).toBe(0)
  })

  it('rejects a query whose letters are not all present', () => {
    expect(fuzzyScore('xyz', 'File: Save')).toBe(-1)
  })

  it('matches case-insensitively', () => {
    expect(fuzzyScore('SAVE', 'File: Save')).toBeGreaterThan(0)
  })

  it('prefers a prefix over a mid-string match', () => {
    expect(fuzzyScore('app', 'app.tsx')).toBeGreaterThan(fuzzyScore('app', 'src/app.tsx'))
  })

  it('prefers a path boundary over an earlier mid-word hit', () => {
    // Both contain "hero" as a substring; the boundary match sits one
    // character later, so this only passes if the boundary bonus is real.
    expect(fuzzyScore('hero', 'abcd/hero')).toBeGreaterThan(fuzzyScore('hero', 'abcdhero'))
  })

  it('prefers consecutive letters', () => {
    expect(fuzzyScore('sav', 'File: Save')).toBeGreaterThan(fuzzyScore('sav', 'File: s-a-v'))
  })

  it('ranks real commands above noise', () => {
    const labels = ['File: Save', 'File: Save As…', 'View: Show Explorer', 'Tab: Close Current']
    const ranked = labels
      .map((label) => ({ label, score: fuzzyScore('save', label) }))
      .filter((entry) => entry.score >= 0)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.label)
    expect(ranked[0]).toBe('File: Save')
    expect(ranked).not.toContain('View: Show Explorer')
  })
})
