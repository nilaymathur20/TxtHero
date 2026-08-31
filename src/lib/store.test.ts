import { describe, expect, it, vi } from 'vitest'
import { createStore } from './store'

describe('createStore', () => {
  it('holds its initial value', () => {
    expect(createStore(7).get()).toBe(7)
  })

  it('notifies subscribers on set', () => {
    const store = createStore(1)
    const listener = vi.fn()
    store.subscribe(listener)
    store.set(2)
    expect(store.get()).toBe(2)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('does not notify when the value is unchanged', () => {
    const store = createStore({ a: 1 })
    const value = store.get()
    const listener = vi.fn()
    store.subscribe(listener)
    store.set(value)
    expect(listener).not.toHaveBeenCalled()
  })

  it('updates from the previous value', () => {
    const store = createStore(5)
    store.update((prev) => prev + 3)
    store.update((prev) => prev * 2)
    expect(store.get()).toBe(16)
  })

  it('stops notifying after unsubscribe', () => {
    const store = createStore(0)
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)
    store.set(1)
    unsubscribe()
    store.set(2)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(store.get()).toBe(2)
  })

  it('keeps subscribers isolated', () => {
    const store = createStore(0)
    const a = vi.fn()
    const b = vi.fn()
    store.subscribe(a)
    store.subscribe(b)
    store.set(1)
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)
  })
})
