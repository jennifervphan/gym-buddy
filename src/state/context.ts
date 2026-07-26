import { createContext, useContext } from 'react'
import type { Dispatch } from 'react'
import type { AppData } from '../types'
import type { Action } from './reducer'

export type Store = { data: AppData; dispatch: Dispatch<Action> }

export const StoreContext = createContext<Store | null>(null)

export function useStore(): Store {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore must be used inside <StoreProvider>')
  return store
}
