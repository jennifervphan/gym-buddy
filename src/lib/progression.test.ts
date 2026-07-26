import { describe, expect, it } from 'vitest'
import type { Exercise, LoggedSet, Session, Settings } from '../types'
import { DEFAULT_SETTINGS } from './seed'
import {
  historyFor,
  performanceIn,
  planExercise,
  planSession,
  suggestNextRoutine,
  warmupSets,
} from './progression'

const settings: Settings = { ...DEFAULT_SETTINGS }

const bench: Exercise = {
  id: 'bench',
  name: 'Bench Press',
  muscleGroup: 'chest',
  equipment: 'barbell',
  sets: 3,
  repMin: 5,
  repMax: 8,
  increment: 2.5,
  restSeconds: 180,
  custom: false,
  archived: false,
}

let setCounter = 0
function set(weight: number, reps: number, kind: LoggedSet['kind'] = 'working'): LoggedSet {
  setCounter += 1
  return { id: `s${setCounter}`, kind, weight, reps }
}

/** A finished session where `bench` was performed with the given sets. */
function session(day: number, sets: LoggedSet[], id = `sess-${day}`): Session {
  const startedAt = `2026-01-${String(day).padStart(2, '0')}T10:00:00.000Z`
  return {
    id,
    startedAt,
    finishedAt: `2026-01-${String(day).padStart(2, '0')}T11:00:00.000Z`,
    exercises: [{ exerciseId: 'bench', planned: null, sets }],
  }
}

describe('performanceIn', () => {
  it('returns null when the exercise was not trained', () => {
    expect(performanceIn(session(1, [set(60, 5)]), 'squat')).toBeNull()
  })

  it('returns null when every logged set is empty', () => {
    expect(performanceIn(session(1, [set(60, 0)]), 'bench')).toBeNull()
  })

  it('ignores warmup sets', () => {
    const perf = performanceIn(session(1, [set(40, 10, 'warmup'), set(60, 5), set(60, 5)]), 'bench')
    expect(perf).toMatchObject({ topWeight: 60, setsAtTopWeight: 2, workingSets: 2, volume: 600 })
  })

  it('takes the worst set at the top weight, not the best', () => {
    const perf = performanceIn(session(1, [set(60, 8), set(60, 8), set(60, 6)]), 'bench')
    expect(perf?.minRepsAtTopWeight).toBe(6)
    expect(perf?.setsAtTopWeight).toBe(3)
  })

  it('measures the top weight when the load ramps across sets', () => {
    const perf = performanceIn(session(1, [set(50, 8), set(55, 8), set(60, 7)]), 'bench')
    expect(perf).toMatchObject({ topWeight: 60, setsAtTopWeight: 1, minRepsAtTopWeight: 7 })
    expect(perf?.totalReps).toBe(23)
  })
})

describe('historyFor', () => {
  it('orders newest first and skips unfinished sessions', () => {
    const unfinished: Session = {
      id: 'live',
      startedAt: '2026-01-09T10:00:00.000Z',
      exercises: [{ exerciseId: 'bench', planned: null, sets: [set(80, 8)] }],
    }
    const history = historyFor([session(1, [set(60, 5)]), session(5, [set(65, 5)]), unfinished], 'bench')
    expect(history.map((p) => p.topWeight)).toEqual([65, 60])
  })
})

describe('planExercise: first time', () => {
  it('asks the user to find a working weight', () => {
    const plan = planExercise(bench, [], settings)
    expect(plan).toMatchObject({ kind: 'first-time', weight: null, sets: 3, repTarget: 8 })
    expect(plan.reason).toContain('5–8')
  })

  it('treats history with no completed sets as no history', () => {
    const plan = planExercise(bench, [session(1, [set(60, 0)])], settings)
    expect(plan.kind).toBe('first-time')
  })
})

describe('planExercise: adding weight', () => {
  it('adds the increment once every set clears the top of the range', () => {
    const plan = planExercise(bench, [session(1, [set(60, 8), set(60, 8), set(60, 8)])], settings)
    expect(plan).toMatchObject({ kind: 'add-weight', weight: 62.5, repTarget: 5 })
    expect(plan.reason).toContain('62.5 kg')
  })

  it('adds weight when reps overshoot the top of the range', () => {
    const plan = planExercise(bench, [session(1, [set(60, 10), set(60, 9), set(60, 9)])], settings)
    expect(plan).toMatchObject({ kind: 'add-weight', weight: 62.5 })
  })

  it('adds weight for extra sets beyond the target', () => {
    const plan = planExercise(
      bench,
      [session(1, [set(60, 8), set(60, 8), set(60, 8), set(60, 8)])],
      settings,
    )
    expect(plan).toMatchObject({ kind: 'add-weight', weight: 62.5 })
  })

  it('keeps weights free of float noise', () => {
    const thirds: Exercise = { ...bench, increment: 1.1 }
    const plan = planExercise(thirds, [session(1, [set(60.2, 8), set(60.2, 8), set(60.2, 8)])], settings)
    expect(plan.weight).toBe(61.3)
  })
})

describe('planExercise: holding weight', () => {
  it('chases one more rep when inside the range', () => {
    const plan = planExercise(bench, [session(1, [set(60, 6), set(60, 6), set(60, 6)])], settings)
    expect(plan).toMatchObject({ kind: 'add-reps', weight: 60, repTarget: 7 })
  })

  it('never targets more than the top of the range', () => {
    const plan = planExercise(bench, [session(1, [set(60, 8), set(60, 8), set(60, 7)])], settings)
    expect(plan).toMatchObject({ kind: 'add-reps', weight: 60, repTarget: 8 })
  })

  it('holds the weight to finish the remaining sets', () => {
    const plan = planExercise(bench, [session(1, [set(60, 8), set(60, 8)])], settings)
    expect(plan).toMatchObject({ kind: 'finish-sets', weight: 60, repTarget: 8 })
    expect(plan.reason).toContain('2 of 3 sets')
  })
})

describe('planExercise: stalling and deloading', () => {
  it('repeats the weight after a single miss', () => {
    const plan = planExercise(bench, [session(1, [set(60, 4), set(60, 4), set(60, 3)])], settings)
    expect(plan).toMatchObject({ kind: 'repeat', weight: 60, repTarget: 5 })
  })

  it('deloads after the stall limit is reached', () => {
    const plan = planExercise(
      bench,
      [session(1, [set(60, 4), set(60, 4), set(60, 4)]), session(8, [set(60, 4), set(60, 4), set(60, 3)])],
      settings,
    )
    // 10% off 60 is 54, snapped down to the 2.5 kg grid.
    expect(plan).toMatchObject({ kind: 'deload', weight: 52.5, repTarget: 8 })
  })

  it('does not count misses at a different weight as a stall', () => {
    const plan = planExercise(
      bench,
      [session(1, [set(55, 4), set(55, 4), set(55, 4)]), session(8, [set(60, 4), set(60, 4), set(60, 4)])],
      settings,
    )
    expect(plan.kind).toBe('repeat')
  })

  it('resets the stall count after a successful session at that weight', () => {
    const plan = planExercise(
      bench,
      [
        session(1, [set(60, 4), set(60, 4), set(60, 4)]),
        session(8, [set(60, 6), set(60, 6), set(60, 6)]),
        session(15, [set(60, 4), set(60, 4), set(60, 4)]),
      ],
      settings,
    )
    expect(plan.kind).toBe('repeat')
  })

  it('honours a stricter stall limit', () => {
    const plan = planExercise(bench, [session(1, [set(60, 4), set(60, 4), set(60, 4)])], {
      ...settings,
      stallLimit: 1,
    })
    expect(plan).toMatchObject({ kind: 'deload', weight: 52.5 })
  })

  it('always cuts at least one increment, even on light weights', () => {
    const light: Exercise = { ...bench, increment: 2.5, repMin: 5 }
    const plan = planExercise(light, [session(1, [set(10, 2), set(10, 2), set(10, 2)])], {
      ...settings,
      stallLimit: 1,
    })
    // A flat 10% cut would round back to 10 kg; the plan must go lower than that.
    expect(plan.weight).toBe(7.5)
  })

  it('never deloads below a single increment', () => {
    const plan = planExercise(bench, [session(1, [set(2.5, 1), set(2.5, 1), set(2.5, 1)])], {
      ...settings,
      stallLimit: 1,
    })
    expect(plan.weight).toBe(2.5)
  })
})

describe('planExercise: units', () => {
  it('describes the plan in pounds when that is the chosen unit', () => {
    const plan = planExercise(
      { ...bench, increment: 5 },
      [session(1, [set(135, 8), set(135, 8), set(135, 8)])],
      { ...settings, unit: 'lb' },
    )
    expect(plan.weight).toBe(140)
    expect(plan.reason).toContain('140 lb')
    expect(plan.reason).not.toContain('kg')
  })
})

describe('planSession', () => {
  const squat: Exercise = { ...bench, id: 'squat', name: 'Back Squat', increment: 5 }
  const retired: Exercise = { ...bench, id: 'old', name: 'Retired Lift', archived: true }
  const routine = { id: 'rt', name: 'Upper A', exerciseIds: ['bench', 'old', 'squat', 'ghost'], custom: false, archived: false }

  it('plans each live exercise and drops archived or missing ones', () => {
    const plan = planSession(routine, [bench, squat, retired], [session(1, [set(60, 8), set(60, 8), set(60, 8)])], settings)
    expect(plan.exercises.map((e) => e.exerciseId)).toEqual(['bench', 'squat'])
    expect(plan.exercises[0]).toMatchObject({ kind: 'add-weight', weight: 62.5 })
    expect(plan.exercises[1]).toMatchObject({ kind: 'first-time' })
    expect(plan.routineName).toBe('Upper A')
  })
})

describe('suggestNextRoutine', () => {
  const routines = [
    { id: 'a', name: 'Upper A', exerciseIds: [], custom: false, archived: false },
    { id: 'b', name: 'Lower A', exerciseIds: [], custom: false, archived: false },
    { id: 'c', name: 'Upper B', exerciseIds: [], custom: false, archived: false },
  ]

  it('starts at the beginning for a new user', () => {
    expect(suggestNextRoutine(routines, [])?.id).toBe('a')
  })

  it('returns null when there is nothing to do', () => {
    expect(suggestNextRoutine([], [])).toBeNull()
  })

  it('advances to the routine after the last completed one', () => {
    const done = { ...session(1, [set(60, 5)]), routineId: 'a' }
    expect(suggestNextRoutine(routines, [done])?.id).toBe('b')
  })

  it('wraps around at the end of the rotation', () => {
    const done = { ...session(1, [set(60, 5)]), routineId: 'c' }
    expect(suggestNextRoutine(routines, [done])?.id).toBe('a')
  })

  it('uses the most recent session, not the last in the array', () => {
    const older = { ...session(1, [set(60, 5)]), id: 'older', routineId: 'c' }
    const newer = { ...session(9, [set(60, 5)]), id: 'newer', routineId: 'a' }
    expect(suggestNextRoutine(routines, [newer, older])?.id).toBe('b')
  })

  it('skips archived routines', () => {
    const withArchived = [routines[0]!, { ...routines[1]!, archived: true }, routines[2]!]
    const done = { ...session(1, [set(60, 5)]), routineId: 'a' }
    expect(suggestNextRoutine(withArchived, [done])?.id).toBe('c')
  })

  it('falls back to the first routine when the last one no longer exists', () => {
    const done = { ...session(1, [set(60, 5)]), routineId: 'deleted' }
    expect(suggestNextRoutine(routines, [done])?.id).toBe('a')
  })
})

describe('warmupSets', () => {
  it('ramps up to a heavy working weight', () => {
    expect(warmupSets(100, bench)).toEqual([
      { weight: 40, reps: 8 },
      { weight: 60, reps: 5 },
      { weight: 80, reps: 3 },
    ])
  })

  it('skips warmups for bodyweight work', () => {
    expect(warmupSets(0, { ...bench, equipment: 'bodyweight' })).toEqual([])
  })

  it('skips warmups for weights light enough not to need them', () => {
    expect(warmupSets(15, bench)).toEqual([])
  })
})
