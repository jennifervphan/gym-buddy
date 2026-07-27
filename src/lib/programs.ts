import type { Exercise, MuscleGroup, Routine, Session } from '../types'

/**
 * A ready-made training split. Days reference exercises by name; they are
 * resolved against the user's library when the program is applied.
 */
export type Program = {
  id: string
  name: string
  /** One line describing who it suits. */
  summary: string
  daysPerWeek: number
  days: { name: string; exercises: string[] }[]
}

export const PROGRAMS: Program[] = [
  {
    id: 'upper-lower-4',
    name: 'Upper / Lower',
    summary: 'Four days a week, alternating A and B sessions so nothing is trained the same way twice.',
    daysPerWeek: 4,
    days: [
      {
        name: 'Upper A',
        exercises: ['Bench Press', 'Barbell Row', 'Dumbbell Shoulder Press', 'Lat Pulldown', 'Dumbbell Curl', 'Cable Triceps Pushdown'],
      },
      {
        name: 'Lower A',
        exercises: ['Back Squat', 'Romanian Deadlift', 'Leg Press', 'Leg Curl', 'Calf Raise', 'Hanging Leg Raise'],
      },
      {
        name: 'Upper B',
        exercises: ['Overhead Press', 'Pull-up', 'Incline Dumbbell Press', 'Seated Cable Row', 'Lateral Raise', 'Cable Face Pull'],
      },
      {
        name: 'Lower B',
        exercises: ['Deadlift', 'Front Squat', 'Bulgarian Split Squat', 'Hip Thrust', 'Leg Extension', 'Plank'],
      },
    ],
  },
  {
    id: 'upper-lower-2',
    name: 'Upper / Lower — simple',
    summary: 'Two days a week, one upper and one lower session. The least to keep track of.',
    daysPerWeek: 2,
    days: [
      {
        name: 'Upper Body',
        exercises: ['Bench Press', 'Barbell Row', 'Dumbbell Shoulder Press', 'Lat Pulldown', 'Dumbbell Curl', 'Cable Triceps Pushdown'],
      },
      {
        name: 'Lower Body',
        exercises: ['Back Squat', 'Romanian Deadlift', 'Leg Press', 'Leg Curl', 'Calf Raise', 'Plank'],
      },
    ],
  },
  {
    id: 'push-pull-legs',
    name: 'Push / Pull / Legs',
    summary: 'Three days, split by movement rather than body half. Popular once you are training most days.',
    daysPerWeek: 3,
    days: [
      {
        name: 'Push',
        exercises: ['Bench Press', 'Overhead Press', 'Incline Dumbbell Press', 'Lateral Raise', 'Cable Triceps Pushdown', 'Dip'],
      },
      {
        name: 'Pull',
        exercises: ['Deadlift', 'Pull-up', 'Barbell Row', 'Seated Cable Row', 'Dumbbell Curl', 'Cable Face Pull'],
      },
      {
        name: 'Legs',
        exercises: ['Back Squat', 'Romanian Deadlift', 'Leg Press', 'Leg Curl', 'Calf Raise', 'Hanging Leg Raise'],
      },
    ],
  },
  {
    id: 'full-body-3',
    name: 'Full body',
    summary: 'Three days, each hitting everything. Good when sessions get missed — one skipped day costs less.',
    daysPerWeek: 3,
    days: [
      {
        name: 'Full Body A',
        exercises: ['Back Squat', 'Bench Press', 'Barbell Row', 'Romanian Deadlift', 'Cable Triceps Pushdown', 'Plank'],
      },
      {
        name: 'Full Body B',
        exercises: ['Deadlift', 'Overhead Press', 'Lat Pulldown', 'Leg Press', 'Dumbbell Curl', 'Hanging Leg Raise'],
      },
      {
        name: 'Full Body C',
        exercises: ['Front Squat', 'Incline Dumbbell Press', 'Seated Cable Row', 'Hip Thrust', 'Calf Raise', 'Cable Face Pull'],
      },
    ],
  },
]

/** Which half of the body a routine mostly trains. */
export type Focus = 'upper' | 'lower' | 'full'

const UPPER_GROUPS: MuscleGroup[] = ['chest', 'back', 'shoulders', 'biceps', 'triceps']
const LOWER_GROUPS: MuscleGroup[] = ['quads', 'hamstrings', 'glutes', 'calves']

/**
 * Classifies a routine by the muscle groups it trains, so quick-start can offer
 * "Upper" and "Lower" without the user having to tag anything. Core work counts
 * towards neither — it appears in every kind of session.
 */
export function routineFocus(routine: Routine, exercises: Exercise[]): Focus {
  const byId = new Map(exercises.map((e) => [e.id, e]))
  let upper = 0
  let lower = 0

  for (const id of routine.exerciseIds) {
    const group = byId.get(id)?.muscleGroup
    if (!group) continue
    if (UPPER_GROUPS.includes(group)) upper += 1
    else if (LOWER_GROUPS.includes(group)) lower += 1
  }

  // Meaningful work on both halves means it is a full-body day, however the
  // counts happen to fall.
  if (upper >= 2 && lower >= 2) return 'full'
  if (upper > lower) return 'upper'
  if (lower > upper) return 'lower'
  return 'full'
}

/**
 * The routine to offer for a given focus: whichever matching routine has gone
 * longest without being trained. That alternates Upper A and Upper B by itself.
 */
export function nextRoutineForFocus(
  routines: Routine[],
  exercises: Exercise[],
  sessions: Session[],
  focus: Focus,
): Routine | null {
  const lastDone = new Map<string, string>()
  for (const session of sessions) {
    if (!session.finishedAt || !session.routineId) continue
    const current = lastDone.get(session.routineId)
    if (!current || session.startedAt > current) lastDone.set(session.routineId, session.startedAt)
  }

  const candidates = routines
    .filter((r) => !r.archived && r.exerciseIds.length > 0)
    .filter((r) => routineFocus(r, exercises) === focus)

  if (candidates.length === 0) return null

  // '' sorts before any ISO timestamp, so never-trained routines come first.
  return (
    [...candidates].sort((a, b) =>
      (lastDone.get(a.id) ?? '').localeCompare(lastDone.get(b.id) ?? ''),
    )[0] ?? null
  )
}

/**
 * Turns a program into routines against the user's library. Exercises are
 * matched by name; any that were archived are listed so they can be restored,
 * since the program expects them to be trainable.
 */
export function buildProgramRoutines(
  program: Program,
  exercises: Exercise[],
  makeId: () => string,
): { routines: Routine[]; unarchive: string[] } {
  const byName = new Map(exercises.map((e) => [e.name.toLowerCase(), e]))
  const unarchive = new Set<string>()

  const routines = program.days.map((day) => ({
    id: makeId(),
    name: day.name,
    exerciseIds: day.exercises.flatMap((name) => {
      const exercise = byName.get(name.toLowerCase())
      if (!exercise) return []
      if (exercise.archived) unarchive.add(exercise.id)
      return [exercise.id]
    }),
    custom: false,
    archived: false,
  }))

  return { routines, unarchive: [...unarchive] }
}
