import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import type { Config, StateLoad } from 'datatables.net'

const prefix = 'vn-admin-table:'

function readStoredValue<T>(storageKey: string, initial: T): T {
  try {
    const saved = sessionStorage.getItem(storageKey)
    return saved === null ? initial : JSON.parse(saved) as T
  } catch {
    return initial
  }
}

export function rememberTable(key: string): Pick<Config, 'stateSave' | 'stateDuration' | 'stateSaveCallback' | 'stateLoadCallback'> {
  const storageKey = `${prefix}${key}`
  return {
    stateSave: true,
    stateDuration: -1,
    stateSaveCallback: (_settings, state) => {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(state))
      } catch {
        // A disabled or full storage area should never prevent table use.
      }
    },
    stateLoadCallback: () => {
      try {
        const saved = sessionStorage.getItem(storageKey)
        // DataTables waits indefinitely when this callback returns undefined.
        return saved ? JSON.parse(saved) as StateLoad : {}
      } catch {
        return {}
      }
    }
  }
}

export function useRememberedState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const storageKey = `${prefix}${key}`
  const [entry, setEntry] = useState(() => ({ key: storageKey, value: readStoredValue(storageKey, initial) }))
  const value = entry.key === storageKey ? entry.value : readStoredValue(storageKey, initial)
  const setValue: Dispatch<SetStateAction<T>> = useCallback((next) => {
    setEntry((previous) => {
      const current = previous.key === storageKey ? previous.value : readStoredValue(storageKey, initial)
      return {
        key: storageKey,
        value: typeof next === 'function'
          ? (next as (previous: T) => T)(current)
          : next
      }
    })
  }, [storageKey, initial])
  useEffect(() => {
    if (entry.key !== storageKey) return
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(entry.value))
    } catch {
      // Keep the current page usable when session storage is unavailable.
    }
  }, [entry, storageKey])
  return [value, setValue]
}
