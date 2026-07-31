import { describe, expect, it } from 'vitest'
import type { AppData, Exercise, LoggedSet, Session } from '../types'
import { buildSeed } from '../lib/seed'
import { reducer } from './reducer'

function set(id: string, weight: number, reps: number, kind: LoggedSet['kind'] = 'working'): LoggedSet {
  return { id, kind, weight, reps }
}

const active: Session = {
  id: 'live',
  startedAt: '2026-03-02T10:00:00.000Z',
  routineId: 'rt-1',
  routineName: 'Upper A',
  exercises: [
    { exerciseId: 'ex-2', planned: null, sets: [] },
    { exerciseId: 'ex-5', planned: null, sets: [] },
  ],
}

function withActive(): AppData {
  return { ...buildSeed('kg'), activeSession: structuredClone(active) }
}

describe('session lifecycle', () => {
  it('starts a session', () => {
    const next = reducer(buildSeed('kg'), { type: 'start-session', session: active })
    expect(next.activeSession?.id).toBe('live')
  })

  it('discards a session without recording it', () => {
    const next = reducer(withActive(), { type: 'discard-session' })
    expect(next.activeSession).toBeNull()
    expect(next.sessions).toEqual([])
  })

  it('moves a finished session into history with a finish time', () => {
    let data = withActive()
    data = reducer(data, { type: 'add-set', exerciseId: 'ex-2', set: set('s1', 60, 8) })
    data = reducer(data, { type: 'finish-session', at: '2026-03-02T11:05:00.000Z' })
    expect(data.activeSession).toBeNull()
    expect(data.sessions).toHaveLength(1)
    expect(data.sessions[0]).toMatchObject({ id: 'live', finishedAt: '2026-03-02T11:05:00.000Z' })
  })

  it('prunes empty sets and untouched exercises on finish', () => {
    let data = withActive()
    data = reducer(data, { type: 'add-set', exerciseId: 'ex-2', set: set('s1', 60, 8) })
    data = reducer(data, { type: 'add-set', exerciseId: 'ex-2', set: set('s2', 60, 0) })
    data = reducer(data, { type: 'finish-session', at: '2026-03-02T11:05:00.000Z' })
    const stored = data.sessions[0]
    expect(stored?.exercises).toHaveLength(1)
    expect(stored?.exercises[0]?.sets.map((s) => s.id)).toEqual(['s1'])
  })

  it('records nothing when a session is finished with no logged sets', () => {
    const data = reducer(withActive(), { type: 'finish-session', at: '2026-03-02T11:05:00.000Z' })
    expect(data.sessions).toEqual([])
    expect(data.activeSession).toBeNull()
  })

  it('deletes a session from history', () => {
    const data: AppData = { ...buildSeed('kg'), sessions: [{ ...active, finishedAt: 'x' }] }
    expect(reducer(data, { type: 'delete-session', sessionId: 'live' }).sessions).toEqual([])
  })

  it('ignores session edits when nothing is in progress', () => {
    const data = buildSeed('kg')
    expect(reducer(data, { type: 'add-set', exerciseId: 'ex-2', set: set('s1', 60, 8) })).toBe(data)
    expect(reducer(data, { type: 'finish-session', at: 'now' })).toBe(data)
  })

  it('stores bodyweight and notes on the active session', () => {
    let data = reducer(withActive(), { type: 'update-active-session', patch: { bodyweight: 71.5 } })
    data = reducer(data, { type: 'update-active-session', patch: { notes: 'Felt strong' } })
    expect(data.activeSession).toMatchObject({ bodyweight: 71.5, notes: 'Felt strong' })
  })
})

describe('sets within a session', () => {
  it('appends sets to the right exercise', () => {
    let data = withActive()
    data = reducer(data, { type: 'add-set', exerciseId: 'ex-5', set: set('s1', 50, 10) })
    expect(data.activeSession?.exercises[0]?.sets).toEqual([])
    expect(data.activeSession?.exercises[1]?.sets).toHaveLength(1)
  })

  it('patches an existing set', () => {
    let data = reducer(withActive(), { type: 'add-set', exerciseId: 'ex-2', set: set('s1', 60, 8) })
    data = reducer(data, { type: 'update-set', exerciseId: 'ex-2', setId: 's1', patch: { reps: 6 } })
    expect(data.activeSession?.exercises[0]?.sets[0]).toMatchObject({ weight: 60, reps: 6 })
  })

  it('deletes a set', () => {
    let data = reducer(withActive(), { type: 'add-set', exerciseId: 'ex-2', set: set('s1', 60, 8) })
    data = reducer(data, { type: 'delete-set', exerciseId: 'ex-2', setId: 's1' })
    expect(data.activeSession?.exercises[0]?.sets).toEqual([])
  })

  it('records a per-exercise note', () => {
    const data = reducer(withActive(), {
      type: 'set-exercise-notes',
      exerciseId: 'ex-2',
      notes: 'Left shoulder tight',
    })
    expect(data.activeSession?.exercises[0]?.notes).toBe('Left shoulder tight')
  })
})

describe('exercises within a session', () => {
  it('adds an exercise mid-session', () => {
    const data = reducer(withActive(), { type: 'add-exercise', exerciseId: 'ex-9', planned: null })
    expect(data.activeSession?.exercises.map((e) => e.exerciseId)).toEqual(['ex-2', 'ex-5', 'ex-9'])
  })

  it('does not add the same exercise twice', () => {
    const before = withActive()
    const after = reducer(before, { type: 'add-exercise', exerciseId: 'ex-2', planned: null })
    expect(after).toBe(before)
  })

  it('removes an exercise', () => {
    const data = reducer(withActive(), { type: 'remove-exercise', exerciseId: 'ex-2' })
    expect(data.activeSession?.exercises.map((e) => e.exerciseId)).toEqual(['ex-5'])
  })
})

describe('reordering a session', () => {
  /** Three exercises, so a move can land in the middle as well as at either end. */
  function withThree(): AppData {
    return {
      ...buildSeed('kg'),
      activeSession: {
        ...structuredClone(active),
        exercises: ['ex-2', 'ex-5', 'ex-9'].map((exerciseId) => ({
          exerciseId,
          planned: null,
          sets: [],
        })),
      },
    }
  }

  const order = (data: AppData) => data.activeSession?.exercises.map((e) => e.exerciseId)

  it('promotes an exercise to the front so it can be done first', () => {
    const data = reducer(withThree(), { type: 'move-exercise', exerciseId: 'ex-9', to: 0 })
    expect(order(data)).toEqual(['ex-9', 'ex-2', 'ex-5'])
  })

  it('moves one position at a time in either direction', () => {
    let data = reducer(withThree(), { type: 'move-exercise', exerciseId: 'ex-2', to: 1 })
    expect(order(data)).toEqual(['ex-5', 'ex-2', 'ex-9'])
    data = reducer(data, { type: 'move-exercise', exerciseId: 'ex-9', to: 1 })
    expect(order(data)).toEqual(['ex-5', 'ex-9', 'ex-2'])
  })

  it('carries the exercise\'s logged sets with it', () => {
    let data = reducer(withThree(), { type: 'add-set', exerciseId: 'ex-9', set: set('s1', 60, 8) })
    data = reducer(data, { type: 'move-exercise', exerciseId: 'ex-9', to: 0 })
    expect(data.activeSession?.exercises[0]).toMatchObject({ exerciseId: 'ex-9' })
    expect(data.activeSession?.exercises[0]?.sets).toHaveLength(1)
  })

  it('clamps a target beyond either end rather than losing the exercise', () => {
    const up = reducer(withThree(), { type: 'move-exercise', exerciseId: 'ex-5', to: -3 })
    expect(order(up)).toEqual(['ex-5', 'ex-2', 'ex-9'])
    const down = reducer(withThree(), { type: 'move-exercise', exerciseId: 'ex-5', to: 99 })
    expect(order(down)).toEqual(['ex-2', 'ex-9', 'ex-5'])
  })

  it('ignores a move that changes nothing', () => {
    const before = withThree()
    expect(reducer(before, { type: 'move-exercise', exerciseId: 'ex-2', to: 0 })).toBe(before)
    expect(reducer(before, { type: 'move-exercise', exerciseId: 'ghost', to: 0 })).toBe(before)
  })

  it('ignores a move when nothing is in progress', () => {
    const data = buildSeed('kg')
    expect(reducer(data, { type: 'move-exercise', exerciseId: 'ex-2', to: 0 })).toBe(data)
  })
})

describe('library edits', () => {
  const custom: Exercise = {
    id: 'custom-1',
    name: 'Zercher Squat',
    muscleGroup: 'quads',
    equipment: 'barbell',
    sets: 3,
    metric: 'reps',
    repMin: 5,
    repMax: 8,
    increment: 5,
    restSeconds: 180,
    custom: true,
    archived: false,
  }

  it('adds a new exercise', () => {
    const data = reducer(buildSeed('kg'), { type: 'save-exercise', exercise: custom })
    expect(data.exercises.at(-1)).toEqual(custom)
  })

  it('updates an existing exercise in place', () => {
    const seed = buildSeed('kg')
    const edited = { ...seed.exercises[0]!, repMax: 10 }
    const data = reducer(seed, { type: 'save-exercise', exercise: edited })
    expect(data.exercises).toHaveLength(seed.exercises.length)
    expect(data.exercises[0]?.repMax).toBe(10)
  })

  it('archives and restores an exercise', () => {
    let data = reducer(buildSeed('kg'), { type: 'archive-exercise', exerciseId: 'ex-1', archived: true })
    expect(data.exercises.find((e) => e.id === 'ex-1')?.archived).toBe(true)
    data = reducer(data, { type: 'archive-exercise', exerciseId: 'ex-1', archived: false })
    expect(data.exercises.find((e) => e.id === 'ex-1')?.archived).toBe(false)
  })

  it('saves and deletes routines', () => {
    const routine = { id: 'rt-new', name: 'Arms', exerciseIds: ['ex-13'], custom: true, archived: false }
    let data = reducer(buildSeed('kg'), { type: 'save-routine', routine })
    expect(data.routines).toHaveLength(5)
    data = reducer(data, { type: 'save-routine', routine: { ...routine, name: 'Arm Day' } })
    expect(data.routines).toHaveLength(5)
    expect(data.routines.at(-1)?.name).toBe('Arm Day')
    data = reducer(data, { type: 'delete-routine', routineId: 'rt-new' })
    expect(data.routines).toHaveLength(4)
  })
})

describe('settings', () => {
  it('patches settings without touching weights', () => {
    const data = reducer(buildSeed('kg'), { type: 'update-settings', patch: { weeklyTarget: 3 } })
    expect(data.settings.weeklyTarget).toBe(3)
    expect(data.settings.unit).toBe('kg')
  })

  it('converts stored weights when the unit changes', () => {
    const seed: AppData = {
      ...buildSeed('kg'),
      sessions: [
        {
          ...active,
          finishedAt: 'x',
          exercises: [{ exerciseId: 'ex-2', planned: null, sets: [set('s1', 60, 8)] }],
        },
      ],
    }
    const data = reducer(seed, { type: 'update-settings', patch: { unit: 'lb' } })
    expect(data.settings.unit).toBe('lb')
    expect(data.sessions[0]?.exercises[0]?.sets[0]?.weight).toBeCloseTo(132.28, 1)
  })

  it('applies a unit change alongside other settings', () => {
    const data = reducer(buildSeed('kg'), {
      type: 'update-settings',
      patch: { unit: 'lb', weeklyTarget: 5 },
    })
    expect(data.settings).toMatchObject({ unit: 'lb', weeklyTarget: 5 })
  })
})

describe('bulk data', () => {
  it('replaces everything on import', () => {
    const imported: AppData = { ...buildSeed('lb'), sessions: [{ ...active, finishedAt: 'x' }] }
    expect(reducer(buildSeed('kg'), { type: 'replace-data', data: imported })).toBe(imported)
  })

  it('reseeds on reset', () => {
    const dirty: AppData = { ...buildSeed('kg'), sessions: [{ ...active, finishedAt: 'x' }] }
    const data = reducer(dirty, { type: 'reset-data', unit: 'lb' })
    expect(data.sessions).toEqual([])
    expect(data.settings.unit).toBe('lb')
  })
})

describe('applying a program', () => {
  const routines = [
    { id: 'p1', name: 'Push', exerciseIds: ['ex-2'], custom: false, archived: false },
    { id: 'p2', name: 'Pull', exerciseIds: ['ex-5'], custom: false, archived: false },
  ]

  it('replaces the routines wholesale', () => {
    const data = reducer(buildSeed('kg'), { type: 'apply-program', routines, unarchive: [] })
    expect(data.routines).toEqual(routines)
  })

  it('keeps logged sessions', () => {
    const withHistory: AppData = { ...buildSeed('kg'), sessions: [{ ...active, finishedAt: 'x' }] }
    const data = reducer(withHistory, { type: 'apply-program', routines, unarchive: [] })
    expect(data.sessions).toHaveLength(1)
  })

  it('restores archived exercises the program needs', () => {
    const seeded = reducer(buildSeed('kg'), {
      type: 'archive-exercise',
      exerciseId: 'ex-2',
      archived: true,
    })
    const data = reducer(seeded, { type: 'apply-program', routines, unarchive: ['ex-2'] })
    expect(data.exercises.find((e) => e.id === 'ex-2')?.archived).toBe(false)
  })

  it('leaves other archived exercises alone', () => {
    const seeded = reducer(buildSeed('kg'), {
      type: 'archive-exercise',
      exerciseId: 'ex-9',
      archived: true,
    })
    const data = reducer(seeded, { type: 'apply-program', routines, unarchive: ['ex-2'] })
    expect(data.exercises.find((e) => e.id === 'ex-9')?.archived).toBe(true)
  })

  it('does not disturb a session in progress', () => {
    const data = reducer(withActive(), { type: 'apply-program', routines, unarchive: [] })
    expect(data.activeSession?.id).toBe('live')
  })
})

describe('recording a backup', () => {
  it('stores the time and the finished session count', () => {
    const seeded: AppData = {
      ...buildSeed('kg'),
      sessions: [{ ...active, finishedAt: 'x' }, { ...active, id: 'live-2' }],
    }
    const data = reducer(seeded, { type: 'record-backup', at: '2026-03-12T12:00:00.000Z' })
    // Only the finished one counts towards what has been saved.
    expect(data.lastBackup).toEqual({ at: '2026-03-12T12:00:00.000Z', sessionCount: 1 })
  })

  it('overwrites an earlier backup record', () => {
    const seeded: AppData = { ...buildSeed('kg'), lastBackup: { at: 'old', sessionCount: 99 } }
    const data = reducer(seeded, { type: 'record-backup', at: '2026-03-12T12:00:00.000Z' })
    expect(data.lastBackup?.sessionCount).toBe(0)
  })
})
