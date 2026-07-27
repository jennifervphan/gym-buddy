import type {
  AppData,
  Exercise,
  LoggedSet,
  PlannedExercise,
  Routine,
  Session,
  Settings,
  Unit,
} from '../types'
import { buildSeed } from '../lib/seed'
import { convertUnits } from '../lib/storage'

export type Action =
  | { type: 'start-session'; session: Session }
  | { type: 'add-exercise'; exerciseId: string; planned: PlannedExercise | null; sets?: LoggedSet[] }
  | { type: 'remove-exercise'; exerciseId: string }
  | { type: 'add-set'; exerciseId: string; set: LoggedSet }
  | { type: 'update-set'; exerciseId: string; setId: string; patch: Partial<LoggedSet> }
  | { type: 'delete-set'; exerciseId: string; setId: string }
  | { type: 'set-exercise-notes'; exerciseId: string; notes: string }
  | { type: 'update-active-session'; patch: Partial<Pick<Session, 'notes' | 'bodyweight'>> }
  | { type: 'finish-session'; at: string }
  | { type: 'discard-session' }
  | { type: 'delete-session'; sessionId: string }
  | { type: 'save-exercise'; exercise: Exercise }
  | { type: 'archive-exercise'; exerciseId: string; archived: boolean }
  | { type: 'save-routine'; routine: Routine }
  | { type: 'delete-routine'; routineId: string }
  | { type: 'apply-program'; routines: Routine[]; unarchive: string[] }
  | { type: 'record-backup'; at: string }
  | { type: 'update-settings'; patch: Partial<Settings> }
  | { type: 'replace-data'; data: AppData }
  | { type: 'reset-data'; unit: Unit }

/** Applies `fn` to the active session's entry for one exercise. */
function mapEntry(
  data: AppData,
  exerciseId: string,
  fn: (entry: Session['exercises'][number]) => Session['exercises'][number],
): AppData {
  if (!data.activeSession) return data
  return {
    ...data,
    activeSession: {
      ...data.activeSession,
      exercises: data.activeSession.exercises.map((entry) =>
        entry.exerciseId === exerciseId ? fn(entry) : entry,
      ),
    },
  }
}

/**
 * Drops sets that were never filled in and exercises left untouched, so history
 * records what actually happened rather than what was planned.
 */
function pruneForHistory(session: Session): Session {
  return {
    ...session,
    exercises: session.exercises
      .map((entry) => ({ ...entry, sets: entry.sets.filter((s) => s.reps > 0) }))
      .filter((entry) => entry.sets.length > 0),
  }
}

export function reducer(data: AppData, action: Action): AppData {
  switch (action.type) {
    case 'start-session':
      return { ...data, activeSession: action.session }

    case 'add-exercise': {
      if (!data.activeSession) return data
      if (data.activeSession.exercises.some((e) => e.exerciseId === action.exerciseId)) return data
      return {
        ...data,
        activeSession: {
          ...data.activeSession,
          exercises: [
            ...data.activeSession.exercises,
            { exerciseId: action.exerciseId, planned: action.planned, sets: action.sets ?? [] },
          ],
        },
      }
    }

    case 'remove-exercise': {
      if (!data.activeSession) return data
      return {
        ...data,
        activeSession: {
          ...data.activeSession,
          exercises: data.activeSession.exercises.filter((e) => e.exerciseId !== action.exerciseId),
        },
      }
    }

    case 'add-set':
      return mapEntry(data, action.exerciseId, (entry) => ({
        ...entry,
        sets: [...entry.sets, action.set],
      }))

    case 'update-set':
      return mapEntry(data, action.exerciseId, (entry) => ({
        ...entry,
        sets: entry.sets.map((s) => (s.id === action.setId ? { ...s, ...action.patch } : s)),
      }))

    case 'delete-set':
      return mapEntry(data, action.exerciseId, (entry) => ({
        ...entry,
        sets: entry.sets.filter((s) => s.id !== action.setId),
      }))

    case 'set-exercise-notes':
      return mapEntry(data, action.exerciseId, (entry) => ({ ...entry, notes: action.notes }))

    case 'update-active-session': {
      if (!data.activeSession) return data
      return { ...data, activeSession: { ...data.activeSession, ...action.patch } }
    }

    case 'finish-session': {
      if (!data.activeSession) return data
      const pruned = pruneForHistory(data.activeSession)
      // Nothing was logged, so there is nothing worth keeping.
      if (pruned.exercises.length === 0) return { ...data, activeSession: null }
      return {
        ...data,
        sessions: [...data.sessions, { ...pruned, finishedAt: action.at }],
        activeSession: null,
      }
    }

    case 'discard-session':
      return { ...data, activeSession: null }

    case 'delete-session':
      return { ...data, sessions: data.sessions.filter((s) => s.id !== action.sessionId) }

    case 'save-exercise': {
      const exists = data.exercises.some((e) => e.id === action.exercise.id)
      return {
        ...data,
        exercises: exists
          ? data.exercises.map((e) => (e.id === action.exercise.id ? action.exercise : e))
          : [...data.exercises, action.exercise],
      }
    }

    case 'archive-exercise':
      return {
        ...data,
        exercises: data.exercises.map((e) =>
          e.id === action.exerciseId ? { ...e, archived: action.archived } : e,
        ),
      }

    case 'save-routine': {
      const exists = data.routines.some((r) => r.id === action.routine.id)
      return {
        ...data,
        routines: exists
          ? data.routines.map((r) => (r.id === action.routine.id ? action.routine : r))
          : [...data.routines, action.routine],
      }
    }

    case 'delete-routine':
      return { ...data, routines: data.routines.filter((r) => r.id !== action.routineId) }

    case 'apply-program':
      // Swaps the routines only. Logged sessions and the exercise library are
      // kept, so switching split never costs you history.
      return {
        ...data,
        routines: action.routines,
        exercises: data.exercises.map((e) =>
          action.unarchive.includes(e.id) ? { ...e, archived: false } : e,
        ),
      }

    case 'update-settings': {
      const { unit, ...rest } = action.patch
      const withRest = { ...data, settings: { ...data.settings, ...rest } }
      return unit ? convertUnits(withRest, unit) : withRest
    }

    case 'record-backup':
      return {
        ...data,
        lastBackup: { at: action.at, sessionCount: data.sessions.filter((s) => s.finishedAt).length },
      }

    case 'replace-data':
      return action.data

    case 'reset-data':
      return buildSeed(action.unit)
  }
}
