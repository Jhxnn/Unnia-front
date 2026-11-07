import { useSyncExternalStore } from 'react'
import { sessionStore, type SessionState } from '../../lib/api/session'

export function useSession(): SessionState {
  return useSyncExternalStore(sessionStore.subscribe, sessionStore.getState, sessionStore.getState)
}
