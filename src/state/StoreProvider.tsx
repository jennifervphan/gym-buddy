import { useEffect, useMemo, useReducer } from 'react'
import type { ReactNode } from 'react'
import { load, save } from '../lib/storage'
import { StoreContext } from './context'
import { reducer } from './reducer'

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, undefined, load)

  useEffect(() => {
    save(data)
  }, [data])

  const store = useMemo(() => ({ data, dispatch }), [data])
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}
