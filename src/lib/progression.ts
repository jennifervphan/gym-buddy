import type {
  Exercise,
  LoggedSet,
  PlannedExercise,
  PlannedSession,
  Routine,
  Session,
  Settings,
  Unit,
} from '../types'
import { countNoun } from './format'

/** Strip float noise from weight arithmetic without changing the value. */
export function roundWeight(value: number): number {
  return Math.round(value * 100) / 100
}

function formatWeight(value: number, unit: Unit): string {
  return `${roundWeight(value)} ${unit}`
}

/** How a working load reads in prose — "0 kg" is really "bodyweight". */
function formatLoad(value: number, unit: Unit): string {
  return value > 0 ? formatWeight(value, unit) : 'bodyweight'
}

/** What actually happened for one exercise in one session. */
export type Performance = {
  sessionId: string
  /** ISO timestamp of the session. */
  date: string
  /** Heaviest working weight used. Progression is driven by the top weight. */
  topWeight: number
  /** How many working sets were performed at the top weight. */
  setsAtTopWeight: number
  /** The worst set at the top weight — the honest measure of whether it was cleared. */
  minRepsAtTopWeight: number
  workingSets: number
  totalReps: number
  volume: number
}

function workingSets(sets: LoggedSet[]): LoggedSet[] {
  return sets.filter((s) => s.kind === 'working' && s.reps > 0)
}

/** Reads one exercise's performance out of a session, or null if it wasn't trained. */
export function performanceIn(session: Session, exerciseId: string): Performance | null {
  const entry = session.exercises.find((e) => e.exerciseId === exerciseId)
  if (!entry) return null

  const sets = workingSets(entry.sets)
  if (sets.length === 0) return null

  const topWeight = Math.max(...sets.map((s) => s.weight))
  const atTop = sets.filter((s) => s.weight === topWeight)

  return {
    sessionId: session.id,
    date: session.startedAt,
    topWeight,
    setsAtTopWeight: atTop.length,
    minRepsAtTopWeight: Math.min(...atTop.map((s) => s.reps)),
    workingSets: sets.length,
    totalReps: sets.reduce((sum, s) => sum + s.reps, 0),
    volume: sets.reduce((sum, s) => sum + s.weight * s.reps, 0),
  }
}

/**
 * Every logged performance of an exercise, newest first. Only finished sessions
 * count — an abandoned session shouldn't move the plan.
 */
export function historyFor(sessions: Session[], exerciseId: string): Performance[] {
  return sessions
    .filter((s) => s.finishedAt)
    .flatMap((s) => {
      const perf = performanceIn(s, exerciseId)
      return perf ? [perf] : []
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}

/** Consecutive most-recent sessions that fell short of `repMin` at the same weight. */
function countStalls(history: Performance[], weight: number, repMin: number): number {
  let stalls = 0
  for (const perf of history) {
    if (perf.topWeight !== weight || perf.minRepsAtTopWeight >= repMin) break
    stalls += 1
  }
  return stalls
}

function deloadWeight(weight: number, exercise: Exercise, settings: Settings): number {
  const target = weight * (1 - settings.deloadFraction)
  const { increment } = exercise
  // Snap to the loading grid, and make sure it is a real cut rather than a
  // rounding no-op on light weights.
  const snapped = Math.floor(target / increment) * increment
  const capped = Math.min(snapped, weight - increment)
  return roundWeight(Math.max(capped, increment))
}

/**
 * Double progression: hold the weight until every working set clears `repMax`,
 * then add `increment` and drop back to `repMin`. Stalling twice at the same
 * weight triggers a deload.
 */
export function planExercise(
  exercise: Exercise,
  sessions: Session[],
  settings: Settings,
): PlannedExercise {
  const history = historyFor(sessions, exercise.id)
  const base = {
    exerciseId: exercise.id,
    sets: exercise.sets,
    repMin: exercise.repMin,
    repMax: exercise.repMax,
  }
  const range = `${exercise.repMin}–${exercise.repMax}`
  const last = history[0]

  if (!last) {
    return {
      ...base,
      weight: null,
      repTarget: exercise.repMax,
      kind: 'first-time',
      reason: `First time logging this. Work up to a weight you can control for ${range} ${countNoun(exercise.metric)}, then log what you hit.`,
    }
  }

  const { topWeight, minRepsAtTopWeight: minReps, setsAtTopWeight: setsAtTop } = last
  const w = formatLoad(topWeight, settings.unit)

  // Cleared the top of the range on every set — time to add weight.
  if (minReps >= exercise.repMax && setsAtTop >= exercise.sets) {
    const next = roundWeight(topWeight + exercise.increment)
    return {
      ...base,
      weight: next,
      repTarget: exercise.repMin,
      kind: 'add-weight',
      reason: `You hit ${setsAtTop}×${minReps} at ${w}. Go up to ${formatWeight(next, settings.unit)} and rebuild from ${exercise.repMin} ${countNoun(exercise.metric)}.`,
    }
  }

  // Reps are there but not on every set yet.
  if (minReps >= exercise.repMax) {
    return {
      ...base,
      weight: topWeight,
      repTarget: exercise.repMax,
      kind: 'finish-sets',
      reason: `You reached ${exercise.repMax} ${countNoun(exercise.metric)} at ${w} but only for ${setsAtTop} of ${exercise.sets} sets. Same weight — get all ${exercise.sets}.`,
    }
  }

  // Inside the range: chase one more rep per set.
  if (minReps >= exercise.repMin) {
    const repTarget = Math.min(exercise.repMax, minReps + 1)
    return {
      ...base,
      weight: topWeight,
      repTarget,
      kind: 'add-reps',
      reason: `Last time: ${setsAtTop}×${minReps} at ${w}. Stay at ${w} and aim for ${repTarget} ${countNoun(exercise.metric)} on every set.`,
    }
  }

  // Below the range. Repeat once, then cut the weight — except at bodyweight,
  // where there is nothing to cut and the only honest advice is to try again.
  const stalls = countStalls(history, topWeight, exercise.repMin)
  if (stalls >= settings.stallLimit && topWeight > 0) {
    const next = deloadWeight(topWeight, exercise, settings)
    return {
      ...base,
      weight: next,
      repTarget: exercise.repMax,
      kind: 'deload',
      reason: `${stalls} sessions stuck under ${exercise.repMin} ${countNoun(exercise.metric)} at ${w}. Drop to ${formatWeight(next, settings.unit)} and build back up.`,
    }
  }

  return {
    ...base,
    weight: topWeight,
    repTarget: exercise.repMin,
    kind: 'repeat',
    reason: `You managed ${minReps} ${countNoun(exercise.metric)} at ${w}, short of ${exercise.repMin}. Repeat ${w} and get at least ${exercise.repMin}.`,
  }
}

export function planSession(
  routine: Routine,
  exercises: Exercise[],
  sessions: Session[],
  settings: Settings,
): PlannedSession {
  const byId = new Map(exercises.map((e) => [e.id, e]))
  return {
    routineId: routine.id,
    routineName: routine.name,
    exercises: routine.exerciseIds.flatMap((id) => {
      const exercise = byId.get(id)
      if (!exercise || exercise.archived) return []
      return [planExercise(exercise, sessions, settings)]
    }),
  }
}

/**
 * The next routine in the rotation: whatever follows the most recently
 * completed one. Falls back to the first routine for a brand new user.
 */
export function suggestNextRoutine(routines: Routine[], sessions: Session[]): Routine | null {
  const active = routines.filter((r) => !r.archived)
  if (active.length === 0) return null

  const lastWithRoutine = sessions
    .filter((s) => s.finishedAt && s.routineId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0]

  if (!lastWithRoutine) return active[0] ?? null

  const index = active.findIndex((r) => r.id === lastWithRoutine.routineId)
  if (index === -1) return active[0] ?? null
  return active[(index + 1) % active.length] ?? null
}

/**
 * Suggested warmup ramp up to a working weight. Empty for light or bodyweight
 * work, and for time-based work, where a rep-count ramp says nothing useful.
 */
export function warmupSets(workingWeight: number, exercise: Exercise): { weight: number; reps: number }[] {
  if (exercise.metric === 'seconds') return []
  if (exercise.equipment === 'bodyweight' || workingWeight < exercise.increment * 8) return []
  return [
    { weight: roundWeight(Math.max(exercise.increment, workingWeight * 0.4)), reps: 8 },
    { weight: roundWeight(workingWeight * 0.6), reps: 5 },
    { weight: roundWeight(workingWeight * 0.8), reps: 3 },
  ]
}
