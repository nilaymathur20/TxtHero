import type { Extension } from '@codemirror/state'

export type LanguageId =
  | 'plaintext'
  | 'javascript'
  | 'typescript'
  | 'json'
  | 'markdown'
  | 'python'
  | 'html'
  | 'css'
  | 'xml'
  | 'yaml'

export interface LanguageSpec {
  id: LanguageId
  label: string
  extensions: string[]
  /**
   * Grammar + highlighter, loaded on demand so the initial bundle only pays
   * for the languages the user actually opens.
   */
  load(): Promise<Extension[]>
}

export const LANGUAGES: LanguageSpec[] = [
  {
    id: 'plaintext',
    label: 'Plain Text',
    extensions: ['txt', 'log', 'mdown', 'conf', 'ini', 'env'],
    load: async () => [],
  },
  {
    id: 'javascript',
    label: 'JavaScript',
    extensions: ['js', 'jsx', 'mjs', 'cjs'],
    load: async () => {
      const { javascript } = await import('@codemirror/lang-javascript')
      return [javascript({ jsx: true })]
    },
  },
  {
    id: 'typescript',
    label: 'TypeScript',
    extensions: ['ts', 'tsx', 'mts', 'cts'],
    load: async () => {
      const { javascript } = await import('@codemirror/lang-javascript')
      return [javascript({ jsx: true, typescript: true })]
    },
  },
  {
    id: 'json',
    label: 'JSON',
    extensions: ['json', 'jsonc', 'map'],
    load: async () => {
      const { json } = await import('@codemirror/lang-json')
      return [json()]
    },
  },
  {
    id: 'markdown',
    label: 'Markdown',
    extensions: ['md', 'markdown', 'mdx'],
    load: async () => {
      const { markdown } = await import('@codemirror/lang-markdown')
      return [markdown()]
    },
  },
  {
    id: 'python',
    label: 'Python',
    extensions: ['py', 'pyi', 'pyw'],
    load: async () => {
      const { python } = await import('@codemirror/lang-python')
      return [python()]
    },
  },
  {
    id: 'html',
    label: 'HTML',
    extensions: ['html', 'htm', 'vue', 'svelte'],
    load: async () => {
      const { html } = await import('@codemirror/lang-html')
      return [html()]
    },
  },
  {
    id: 'css',
    label: 'CSS',
    extensions: ['css', 'scss', 'less'],
    load: async () => {
      const { css } = await import('@codemirror/lang-css')
      return [css()]
    },
  },
  {
    id: 'xml',
    label: 'XML',
    extensions: ['xml', 'svg', 'xsd', 'xsl'],
    load: async () => {
      const { xml } = await import('@codemirror/lang-xml')
      return [xml()]
    },
  },
  {
    id: 'yaml',
    label: 'YAML',
    extensions: ['yaml', 'yml'],
    load: async () => {
      const { yaml } = await import('@codemirror/lang-yaml')
      return [yaml()]
    },
  },
]

const BY_ID = new Map<LanguageId, LanguageSpec>(LANGUAGES.map((l) => [l.id, l]))

export function languageById(id: LanguageId): LanguageSpec {
  return BY_ID.get(id) ?? BY_ID.get('plaintext')!
}

export function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.')
  if (dot <= 0 || dot === name.length - 1) return ''
  return name.slice(dot + 1).toLowerCase()
}

export function detectLanguage(name: string): LanguageId {
  const ext = extensionOf(name)
  if (!ext) return 'plaintext'
  for (const spec of LANGUAGES) {
    if (spec.extensions.includes(ext)) return spec.id
  }
  return 'plaintext'
}
