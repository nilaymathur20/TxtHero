import type {
  TxtFileSystemDirectoryHandle,
  TxtFileSystemFileHandle,
  TxtFileSystemHandle,
} from '../vite-env'

export interface TreeNode {
  name: string
  /** Slash-joined path relative to the opened directory root. */
  path: string
  kind: 'file' | 'directory'
  children: TreeNode[]
}

export interface OpenedFile {
  name: string
  content: string
  handle: TxtFileSystemFileHandle | null
  path: string | null
}

/** Directories never worth walking, and a hard ceiling so a huge repo can't hang the tab. */
const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'out', '.next', '.cache', '__pycache__', '.venv', 'target', 'coverage'])
const MAX_ENTRIES = 8000

export function supportsFileSystemAccess(): boolean {
  return typeof window !== 'undefined' && typeof window.showOpenFilePicker === 'function'
}

export function supportsDirectoryAccess(): boolean {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function'
}

async function ensurePermission(
  handle: TxtFileSystemHandle,
  mode: 'read' | 'readwrite',
): Promise<boolean> {
  if (typeof handle.queryPermission !== 'function' || typeof handle.requestPermission !== 'function') {
    return true
  }
  const descriptor = { mode }
  if ((await handle.queryPermission(descriptor)) === 'granted') return true
  return (await handle.requestPermission(descriptor)) === 'granted'
}

export async function pickFiles(): Promise<TxtFileSystemFileHandle[]> {
  if (!window.showOpenFilePicker) return []
  try {
    return await window.showOpenFilePicker({ multiple: true, excludeAcceptAllOption: false })
  } catch (error) {
    if (isAbort(error)) return []
    throw error
  }
}

export async function pickDirectory(): Promise<TxtFileSystemDirectoryHandle | null> {
  if (!window.showDirectoryPicker) return null
  try {
    return await window.showDirectoryPicker({ mode: 'readwrite' })
  } catch (error) {
    if (isAbort(error)) return null
    throw error
  }
}

export async function pickSaveLocation(suggestedName: string): Promise<TxtFileSystemFileHandle | null> {
  if (!window.showSaveFilePicker) return null
  try {
    return await window.showSaveFilePicker({ suggestedName, excludeAcceptAllOption: false })
  } catch (error) {
    if (isAbort(error)) return null
    throw error
  }
}

export async function readHandle(handle: TxtFileSystemFileHandle): Promise<string> {
  if (!(await ensurePermission(handle, 'read'))) {
    throw new Error(`Permission to read “${handle.name}” was denied.`)
  }
  const file = await handle.getFile()
  return file.text()
}

export async function writeHandle(handle: TxtFileSystemFileHandle, content: string): Promise<void> {
  if (!(await ensurePermission(handle, 'readwrite'))) {
    throw new Error(`Permission to write “${handle.name}” was denied.`)
  }
  const writable = await handle.createWritable()
  await writable.write(content)
  await writable.close()
}

/** Classic download fallback for browsers without the File System Access API. */
export function downloadFile(name: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Give the browser a tick to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function uploadFiles(): Promise<OpenedFile[]> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.style.display = 'none'
    input.addEventListener('change', async () => {
      try {
        const picked = Array.from(input.files ?? [])
        const opened: OpenedFile[] = []
        for (const file of picked) {
          opened.push({
            name: file.name,
            content: await file.text(),
            handle: null,
            path: (file as File & { webkitRelativePath?: string }).webkitRelativePath || null,
          })
        }
        resolve(opened)
      } catch (error) {
        reject(error)
      } finally {
        input.remove()
      }
    })
    document.body.appendChild(input)
    input.click()
  })
}

/** Recursively index a directory, skipping junk and bailing out at MAX_ENTRIES. */
export async function readTree(
  root: TxtFileSystemDirectoryHandle,
  onProgress?: (count: number) => void,
): Promise<TreeNode[]> {
  let seen = 0

  const walk = async (dir: TxtFileSystemDirectoryHandle, prefix: string): Promise<TreeNode[]> => {
    const nodes: TreeNode[] = []
    for await (const entry of dir.values()) {
      if (seen >= MAX_ENTRIES) break
      seen += 1
      if (seen % 250 === 0) onProgress?.(seen)

      const path = prefix ? `${prefix}/${entry.name}` : entry.name

      if (entry.kind === 'directory') {
        if (IGNORED_DIRS.has(entry.name)) continue
        const childDir = entry as TxtFileSystemDirectoryHandle
        nodes.push({
          name: entry.name,
          path,
          kind: 'directory',
          children: await walk(childDir, path),
        })
      } else {
        nodes.push({ name: entry.name, path, kind: 'file', children: [] })
      }
    }
    return nodes
  }

  const tree = await walk(root, '')
  return sortTree(tree)
}

export function sortTree(nodes: TreeNode[]): TreeNode[] {
  const sorted = [...nodes].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true })
  })
  for (const node of sorted) {
    if (node.children.length > 0) sortTree(node.children)
  }
  return sorted
}

export function resolveNode(root: TxtFileSystemDirectoryHandle, path: string): Promise<TxtFileSystemFileHandle> {
  const parts = path.split('/').filter(Boolean)
  const fileName = parts.pop()
  if (!fileName) return Promise.reject(new Error(`Cannot resolve “${path}”.`))

  return parts
    .reduce<Promise<TxtFileSystemDirectoryHandle>>(
      (acc, part) => acc.then((dir) => dir.getDirectoryHandle(part)),
      Promise.resolve(root),
    )
    .then((dir) => dir.getFileHandle(fileName))
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && (error.name === 'AbortError' || error.name === 'NotAllowedError')
}
