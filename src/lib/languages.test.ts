import { describe, expect, it } from 'vitest'
import { detectLanguage, extensionOf, languageById, LANGUAGES, type LanguageId } from './languages'

describe('extensionOf', () => {
  it('lowercases the final extension', () => {
    expect(extensionOf('Archive.TAR.GZ')).toBe('gz')
    expect(extensionOf('app.TSX')).toBe('tsx')
  })

  it('returns empty for extension-less and dotfile names', () => {
    expect(extensionOf('Makefile')).toBe('')
    expect(extensionOf('.env')).toBe('')
    expect(extensionOf('trailing.')).toBe('')
  })
})

describe('detectLanguage', () => {
  it.each([
    ['app.ts', 'typescript'],
    ['app.tsx', 'typescript'],
    ['app.mts', 'typescript'],
    ['app.js', 'javascript'],
    ['app.jsx', 'javascript'],
    ['config.json', 'json'],
    ['notes.md', 'markdown'],
    ['main.py', 'python'],
    ['index.html', 'html'],
    ['style.css', 'css'],
    ['icon.svg', 'xml'],
    ['ci.yml', 'yaml'],
    ['ci.yaml', 'yaml'],
  ] as Array<[string, LanguageId]>)('maps %s to %s', (name, expected) => {
    expect(detectLanguage(name)).toBe(expected)
  })

  it('falls back to plain text for unknown and missing extensions', () => {
    expect(detectLanguage('notes.unknownext')).toBe('plaintext')
    expect(detectLanguage('README')).toBe('plaintext')
    expect(detectLanguage('')).toBe('plaintext')
  })
})

describe('languageById', () => {
  it('resolves every declared language', () => {
    for (const spec of LANGUAGES) {
      expect(languageById(spec.id).id).toBe(spec.id)
    }
  })

  it('falls back to plain text for an unknown id', () => {
    expect(languageById('cobol' as LanguageId).id).toBe('plaintext')
  })

  it('declares no duplicate extensions across languages', () => {
    const seen = new Map<string, LanguageId>()
    for (const spec of LANGUAGES) {
      for (const ext of spec.extensions) {
        expect(seen.get(ext), `extension .${ext} claimed by two languages`).toBeUndefined()
        seen.set(ext, spec.id)
      }
    }
  })
})

describe('lazy grammar loading', () => {
  it('loads real extensions for every non-plain language', async () => {
    for (const spec of LANGUAGES) {
      const loaded = await spec.load()
      expect(Array.isArray(loaded), `${spec.id} should resolve to an array`).toBe(true)
      if (spec.id !== 'plaintext') {
        expect(loaded.length, `${spec.id} should load at least one extension`).toBeGreaterThan(0)
      }
    }
  })
})
