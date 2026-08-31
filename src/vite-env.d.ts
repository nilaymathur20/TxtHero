/// <reference types="vite/client" />

/**
 * Minimal declarations for the File System Access API.
 *
 * The API is Chromium-only and still absent from TypeScript's DOM lib, so we
 * describe just the surface TxtHero uses. Every call site feature-detects
 * first (`supportsFileSystemAccess`) and falls back to the classic
 * `<input type="file">` / download path, so the editor works everywhere.
 */

export interface TxtWritableStream {
  write(data: string | Blob | ArrayBuffer): Promise<void>
  close(): Promise<void>
  abort?(reason?: unknown): Promise<void>
}

export type TxtHandleKind = 'file' | 'directory'

export interface TxtPermissionDescriptor {
  mode?: 'read' | 'readwrite'
}

export interface TxtFileSystemHandle {
  kind: TxtHandleKind
  name: string
  queryPermission?(descriptor?: TxtPermissionDescriptor): Promise<PermissionState>
  requestPermission?(descriptor?: TxtPermissionDescriptor): Promise<PermissionState>
}

export interface TxtFileSystemFileHandle extends TxtFileSystemHandle {
  kind: 'file'
  getFile(): Promise<File>
  createWritable(): Promise<TxtWritableStream>
}

export interface TxtFileSystemDirectoryHandle extends TxtFileSystemHandle {
  kind: 'directory'
  values(): AsyncIterableIterator<TxtFileSystemHandle>
  getFileHandle(name: string, options?: { create?: boolean }): Promise<TxtFileSystemFileHandle>
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<TxtFileSystemDirectoryHandle>
}

export interface TxtOpenFilePickerOptions {
  multiple?: boolean
  excludeAcceptAllOption?: boolean
  id?: string
  startIn?: string
  types?: Array<{ description?: string; accept: Record<string, string[]> }>
}

export interface TxtSaveFilePickerOptions {
  suggestedName?: string
  excludeAcceptAllOption?: boolean
  types?: Array<{ description?: string; accept: Record<string, string[]> }>
}

declare global {
  interface Window {
    showOpenFilePicker?(options?: TxtOpenFilePickerOptions): Promise<TxtFileSystemFileHandle[]>
    showSaveFilePicker?(options?: TxtSaveFilePickerOptions): Promise<TxtFileSystemFileHandle>
    showDirectoryPicker?(options?: { id?: string; mode?: 'read' | 'readwrite' }): Promise<TxtFileSystemDirectoryHandle>
  }
}
