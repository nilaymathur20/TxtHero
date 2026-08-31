import { useSyncExternalStore } from 'react'

/**
 * A tiny observable cell.
 *
 * Editor telemetry (cursor position, selection size, document stats) changes
 * on every keystroke. Routing it through React context would re-render the
 * whole shell each time, so it lives here instead: only the components that
 * read the cell re-render, and `useSyncExternalStore` keeps them tear-free.
 */
export interface ExternalStore<T> {
  get(): T
  set(next: T): void
  update(fn: (prev: T) => T): void
  subscribe(listener: () => void): () => void
}

export function createStore<T>(initial: T): ExternalStore<T> {
  let value = initial
  const listeners = new Set<() => void>()

  const publish = () => {
    for (const listener of listeners) listener()
  }

  return {
    get: () => value,
    set(next: T) {
      if (Object.is(next, value)) return
      value = next
      publish()
    },
    update(fn: (prev: T) => T) {
      const next = fn(value)
      if (Object.is(next, value)) return
      value = next
      publish()
    },
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export function useStore<T>(store: ExternalStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get)
}
