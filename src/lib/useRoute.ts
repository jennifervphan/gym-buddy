import { useEffect, useState } from 'react'

export type Route =
  | { name: 'home' }
  | { name: 'workout' }
  | { name: 'history' }
  | { name: 'session'; sessionId: string }
  | { name: 'progress' }
  | { name: 'exercise'; exerciseId: string }
  | { name: 'library' }
  | { name: 'routine'; routineId: string }
  | { name: 'settings' }

function parse(hash: string): Route {
  const path = hash.replace(/^#\/?/, '')
  const [head, param] = path.split('/')
  switch (head) {
    case 'workout':
      return { name: 'workout' }
    case 'history':
      return { name: 'history' }
    case 'session':
      return param ? { name: 'session', sessionId: param } : { name: 'history' }
    case 'progress':
      return { name: 'progress' }
    case 'exercise':
      return param ? { name: 'exercise', exerciseId: param } : { name: 'progress' }
    case 'library':
      return { name: 'library' }
    case 'routine':
      return param ? { name: 'routine', routineId: param } : { name: 'library' }
    case 'settings':
      return { name: 'settings' }
    default:
      return { name: 'home' }
  }
}

export function toHash(route: Route): string {
  switch (route.name) {
    case 'home':
      return '#/'
    case 'session':
      return `#/session/${route.sessionId}`
    case 'exercise':
      return `#/exercise/${route.exerciseId}`
    case 'routine':
      return `#/routine/${route.routineId}`
    default:
      return `#/${route.name}`
  }
}

/**
 * Hash routing, so the phone's back gesture and the browser's back button both
 * work without pulling in a router.
 */
export function useRoute(): { route: Route; navigate: (route: Route) => void; back: () => void } {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash))

  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return {
    route,
    navigate: (next) => {
      window.location.hash = toHash(next)
    },
    back: () => window.history.back(),
  }
}
