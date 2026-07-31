import type { Exercise, LoggedSet, MuscleGroup, Session } from '../types'
import { performanceIn, roundWeight } from './progression'

/**
 * Epley estimate of a one-rep max. Reps are capped at 12 because the formula
 * loses touch with reality on high-rep sets.
 */
export function estimate1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0
  if (reps === 1) return roundWeight(weight)
  return roundWeight(weight * (1 + Math.min(reps, 12) / 30))
}

export function sessionVolume(session: Session): number {
  return session.exercises.reduce(
    (total, entry) =>
      total +
      entry.sets
        .filter((s) => s.kind === 'working')
        .reduce((sum, s) => sum + s.weight * s.reps, 0),
    0,
  )
}

export function sessionWorkingSets(session: Session): number {
  return session.exercises.reduce(
    (total, entry) => total + entry.sets.filter((s) => s.kind === 'working' && s.reps > 0).length,
    0,
  )
}

/**
 * The best working set: highest estimated 1RM, falling back to rep count. The
 * fallback matters for bodyweight work, where every set estimates to zero and
 * reps are the only measure of progress.
 */
export function bestSet(sets: LoggedSet[]): LoggedSet | null {
  const working = sets.filter((s) => s.kind === 'working' && s.reps > 0)
  if (working.length === 0) return null
  return working.reduce((best, s) => {
    const a = estimate1RM(s.weight, s.reps)
    const b = estimate1RM(best.weight, best.reps)
    if (a !== b) return a > b ? s : best
    return s.reps > best.reps ? s : best
  })
}

export type ExerciseRecords = {
  exerciseId: string
  /** Best estimated 1RM and the set that produced it. */
  best1RM: number
  bestSetWeight: number
  bestSetReps: number
  /** Heaviest weight moved for at least one rep. */
  heaviestWeight: number
  /** Best single-session volume for this exercise. */
  bestSessionVolume: number
  sessionCount: number
  lastPerformed: string
}

export function recordsFor(sessions: Session[], exerciseId: string): ExerciseRecords | null {
  const finished = sessions.filter((s) => s.finishedAt)
  let best1RM = 0
  let bestSetWeight = 0
  let bestSetReps = 0
  let heaviestWeight = 0
  let bestSessionVolume = 0
  let sessionCount = 0
  let lastPerformed = ''

  for (const session of finished) {
    const perf = performanceIn(session, exerciseId)
    if (!perf) continue
    sessionCount += 1
    if (session.startedAt > lastPerformed) lastPerformed = session.startedAt
    heaviestWeight = Math.max(heaviestWeight, perf.topWeight)
    bestSessionVolume = Math.max(bestSessionVolume, perf.volume)

    const entry = session.exercises.find((e) => e.exerciseId === exerciseId)
    const top = entry ? bestSet(entry.sets) : null
    if (top) {
      const oneRM = estimate1RM(top.weight, top.reps)
      // Tie on the estimate (always the case for bodyweight work) → more reps wins.
      if (oneRM > best1RM || (oneRM === best1RM && top.reps > bestSetReps)) {
        best1RM = oneRM
        bestSetWeight = top.weight
        bestSetReps = top.reps
      }
    }
  }

  if (sessionCount === 0) return null
  return {
    exerciseId,
    best1RM,
    bestSetWeight,
    bestSetReps,
    heaviestWeight,
    bestSessionVolume,
    sessionCount,
    lastPerformed,
  }
}

export type ExercisePoint = {
  date: string
  estimated1RM: number
  topWeight: number
  volume: number
  totalReps: number
  /** The best single set's count — the only curve that moves for unloaded work. */
  bestCount: number
}

/** Per-session series for one exercise, oldest first, for charting. */
export function seriesFor(sessions: Session[], exerciseId: string): ExercisePoint[] {
  return sessions
    .filter((s) => s.finishedAt)
    .flatMap((session) => {
      const perf = performanceIn(session, exerciseId)
      if (!perf) return []
      const entry = session.exercises.find((e) => e.exerciseId === exerciseId)
      const top = entry ? bestSet(entry.sets) : null
      return [
        {
          date: session.startedAt,
          estimated1RM: top ? estimate1RM(top.weight, top.reps) : 0,
          topWeight: perf.topWeight,
          volume: perf.volume,
          totalReps: perf.totalReps,
          bestCount: top?.reps ?? 0,
        },
      ]
    })
    .sort((a, b) => a.date.localeCompare(b.date))
}

export type BodyweightPoint = { date: string; weight: number }

/**
 * Bodyweight recorded against sessions, oldest first. Only sessions where it
 * was actually entered count — a blank field is not a zero.
 */
export function bodyweightSeries(sessions: Session[]): BodyweightPoint[] {
  return sessions
    .flatMap((s) =>
      s.finishedAt && s.bodyweight !== undefined && s.bodyweight > 0
        ? [{ date: s.startedAt, weight: s.bodyweight }]
        : [],
    )
    .sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Monday-anchored ISO date (YYYY-MM-DD) for the week containing `date`.
 *
 * Deliberately local, not UTC: a session logged at 8pm on a Sunday west of
 * Greenwich is already Monday in UTC, and filing it under the following week
 * would break the streak the user just extended.
 */
export function weekStart(date: Date): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  // getDay is 0 for Sunday; shift so Monday is the first day of the week.
  const offset = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - offset)
  // Formatted by hand — toISOString would convert back to UTC and undo this.
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${String(d.getDate()).padStart(2, '0')}`
}

export type WeekSummary = {
  weekStart: string
  sessions: number
  volume: number
  workingSets: number
}

export function weeklySummaries(sessions: Session[]): WeekSummary[] {
  const byWeek = new Map<string, WeekSummary>()
  for (const session of sessions) {
    if (!session.finishedAt) continue
    const key = weekStart(new Date(session.startedAt))
    const week = byWeek.get(key) ?? { weekStart: key, sessions: 0, volume: 0, workingSets: 0 }
    week.sessions += 1
    week.volume += sessionVolume(session)
    week.workingSets += sessionWorkingSets(session)
    byWeek.set(key, week)
  }
  return [...byWeek.values()].sort((a, b) => a.weekStart.localeCompare(b.weekStart))
}

/**
 * How many consecutive weeks — counting back from the current one — hit the
 * weekly session target.
 *
 * The current week is still in progress, so it only extends the streak; falling
 * short of the target today never breaks it.
 */
/**
 * The Monday a week before the given Monday key. Pure calendar arithmetic on a
 * plain date string — stepping whole weeks in UTC can't drift, and no timezone
 * is involved either side.
 */
function previousWeek(key: string): string {
  const d = new Date(`${key}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() - 7)
  return d.toISOString().slice(0, 10)
}

export function weeklyStreak(sessions: Session[], weeklyTarget: number, now = new Date()): number {
  if (weeklyTarget <= 0) return 0
  const counts = new Map(weeklySummaries(sessions).map((w) => [w.weekStart, w.sessions]))

  let streak = 0
  if ((counts.get(weekStart(now)) ?? 0) >= weeklyTarget) streak += 1

  let cursor = previousWeek(weekStart(now))
  while ((counts.get(cursor) ?? 0) >= weeklyTarget) {
    streak += 1
    cursor = previousWeek(cursor)
  }
  return streak
}

export function sessionsThisWeek(sessions: Session[], now = new Date()): number {
  const key = weekStart(now)
  return sessions.filter((s) => s.finishedAt && weekStart(new Date(s.startedAt)) === key).length
}

export type MuscleGroupVolume = { muscleGroup: MuscleGroup; volume: number; sets: number }

/** Working-set and volume split by muscle group, for spotting neglected areas. */
export function volumeByMuscleGroup(
  sessions: Session[],
  exercises: Exercise[],
  sinceDays = 28,
  now = new Date(),
): MuscleGroupVolume[] {
  const byId = new Map(exercises.map((e) => [e.id, e]))
  const cutoff = new Date(now.getTime() - sinceDays * 24 * 60 * 60 * 1000).toISOString()
  const totals = new Map<string, MuscleGroupVolume>()

  for (const session of sessions) {
    if (!session.finishedAt || session.startedAt < cutoff) continue
    for (const entry of session.exercises) {
      const exercise = byId.get(entry.exerciseId)
      if (!exercise) continue
      const working = entry.sets.filter((s) => s.kind === 'working' && s.reps > 0)
      if (working.length === 0) continue
      const current =
        totals.get(exercise.muscleGroup) ?? { muscleGroup: exercise.muscleGroup, volume: 0, sets: 0 }
      current.volume += working.reduce((sum, s) => sum + s.weight * s.reps, 0)
      current.sets += working.length
      totals.set(exercise.muscleGroup, current)
    }
  }
  return [...totals.values()].sort((a, b) => b.sets - a.sets)
}

/**
 * Exercises in the user's routines that haven't been trained in a while.
 * Surfaced on the dashboard so gaps don't go unnoticed.
 */
export function stalePrescriptions(
  sessions: Session[],
  exercises: Exercise[],
  staleDays = 21,
  now = new Date(),
): { exercise: Exercise; lastPerformed: string | null }[] {
  const cutoff = new Date(now.getTime() - staleDays * 24 * 60 * 60 * 1000).toISOString()
  return exercises
    .filter((e) => !e.archived)
    .flatMap((exercise) => {
      const records = recordsFor(sessions, exercise.id)
      // Never-performed exercises aren't stale, they just haven't started.
      if (!records) return []
      if (records.lastPerformed >= cutoff) return []
      return [{ exercise, lastPerformed: records.lastPerformed }]
    })
    .sort((a, b) => (a.lastPerformed ?? '').localeCompare(b.lastPerformed ?? ''))
}
