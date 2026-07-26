import { useStore } from './state/context'
import { useRoute } from './lib/useRoute'
import type { Route } from './lib/useRoute'
import { Dashboard } from './pages/Dashboard'
import { Workout } from './pages/Workout'
import { History, SessionDetail } from './pages/History'
import { ExerciseDetail, Progress } from './pages/Progress'
import { Library, RoutineDetail } from './pages/Library'
import { Settings } from './pages/Settings'
import {
  IconArrowLeft,
  IconChart,
  IconDumbbell,
  IconHome,
  IconList,
  IconSettings,
} from './components/Icons'

const TABS = [
  { name: 'home', label: 'Home', Icon: IconHome },
  { name: 'workout', label: 'Workout', Icon: IconDumbbell },
  { name: 'progress', label: 'Progress', Icon: IconChart },
  { name: 'history', label: 'History', Icon: IconList },
  { name: 'settings', label: 'Settings', Icon: IconSettings },
] as const

/** Detail routes hang off a tab; the nav highlights the parent. */
const PARENT_TAB: Record<Route['name'], (typeof TABS)[number]['name']> = {
  home: 'home',
  workout: 'workout',
  progress: 'progress',
  exercise: 'progress',
  history: 'history',
  session: 'history',
  library: 'home',
  routine: 'home',
  settings: 'settings',
}

const TITLES: Record<Route['name'], string> = {
  home: 'Gym Buddy',
  workout: 'Workout',
  progress: 'Progress',
  exercise: 'Exercise',
  history: 'History',
  session: 'Session',
  library: 'Library',
  routine: 'Routine',
  settings: 'Settings',
}

const DETAIL_ROUTES: Route['name'][] = ['exercise', 'session', 'routine', 'library']

export function App() {
  const { route, navigate, back } = useRoute()
  const { data } = useStore()
  const activeTab = PARENT_TAB[route.name]
  const showBack = DETAIL_ROUTES.includes(route.name)

  return (
    <div className="app">
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          {showBack && (
            <button type="button" className="btn icon ghost" onClick={back} aria-label="Go back">
              <IconArrowLeft />
            </button>
          )}
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow">
              {route.name === 'home' ? new Date().toLocaleDateString(undefined, { weekday: 'long' }) : 'Gym Buddy'}
            </div>
            <h2>{TITLES[route.name]}</h2>
          </div>
        </div>
        {route.name === 'home' && (
          <button
            type="button"
            className="btn sm"
            onClick={() => navigate({ name: 'library' })}
          >
            Library
          </button>
        )}
      </header>

      <main>
        {route.name === 'home' && <Dashboard navigate={navigate} />}
        {route.name === 'workout' && <Workout navigate={navigate} />}
        {route.name === 'progress' && <Progress navigate={navigate} />}
        {route.name === 'exercise' && (
          <ExerciseDetail exerciseId={route.exerciseId} navigate={navigate} />
        )}
        {route.name === 'history' && <History navigate={navigate} />}
        {route.name === 'session' && <SessionDetail sessionId={route.sessionId} navigate={navigate} />}
        {route.name === 'library' && <Library navigate={navigate} />}
        {route.name === 'routine' && <RoutineDetail routineId={route.routineId} navigate={navigate} />}
        {route.name === 'settings' && <Settings />}
      </main>

      <nav className="bottom-nav" aria-label="Main">
        <div className="nav-inner">
          {TABS.map(({ name, label, Icon }) => (
            <button
              key={name}
              type="button"
              className="nav-btn"
              aria-current={activeTab === name ? 'page' : undefined}
              onClick={() => navigate({ name } as Route)}
            >
              <Icon />
              <span>{label}</span>
              {name === 'workout' && data.activeSession && (
                <span className="sr-only">(session in progress)</span>
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
