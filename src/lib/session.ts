import type { LoggedSet, PlannedExercise, PlannedSession, Routine, Session } from '../types'

/**
 * Empty rows for a prescription, pre-filled with the planned weight so logging a
 * session is just typing rep counts. Rows left at zero reps are dropped when the
 * session is saved, so an unused row costs nothing.
 */
export function blankSets(planned: PlannedExercise | null, makeId: () => string): LoggedSet[] {
  if (!planned) return []
  return Array.from({ length: planned.sets }, () => ({
    id: makeId(),
    kind: 'working' as const,
    weight: planned.weight ?? 0,
    reps: 0,
  }))
}

/** Builds a ready-to-log session from a plan. */
export function buildSession(
  routine: Routine | null,
  plan: PlannedSession | null,
  makeId: () => string,
  startedAt: string,
): Session {
  return {
    id: makeId(),
    startedAt,
    ...(routine ? { routineId: routine.id, routineName: routine.name } : {}),
    exercises:
      plan?.exercises.map((planned) => ({
        exerciseId: planned.exerciseId,
        planned,
        sets: blankSets(planned, makeId),
      })) ?? [],
  }
}
