import { describe, expect, it } from 'vitest'
import type { PlannedExercise, PlannedSession, Routine } from '../types'
import { blankSets, buildSession } from './session'

let counter = 0
const makeId = () => `id-${++counter}`

const planned: PlannedExercise = {
  exerciseId: 'bench',
  sets: 3,
  weight: 60,
  repTarget: 7,
  repMin: 5,
  repMax: 8,
  kind: 'add-reps',
  reason: 'test',
}

const routine: Routine = {
  id: 'rt-1',
  name: 'Upper A',
  exerciseIds: ['bench', 'row'],
  custom: false,
  archived: false,
}

describe('blankSets', () => {
  it('creates one row per planned set, pre-filled with the planned weight', () => {
    const sets = blankSets(planned, makeId)
    expect(sets).toHaveLength(3)
    expect(sets.every((s) => s.weight === 60 && s.reps === 0 && s.kind === 'working')).toBe(true)
  })

  it('gives every row a distinct id', () => {
    const sets = blankSets(planned, makeId)
    expect(new Set(sets.map((s) => s.id)).size).toBe(3)
  })

  it('starts a first-time exercise at zero weight for the user to fill in', () => {
    const sets = blankSets({ ...planned, weight: null }, makeId)
    expect(sets.every((s) => s.weight === 0)).toBe(true)
  })

  it('has nothing to create without a plan', () => {
    expect(blankSets(null, makeId)).toEqual([])
  })
})

describe('buildSession', () => {
  const plan: PlannedSession = {
    routineId: 'rt-1',
    routineName: 'Upper A',
    exercises: [planned, { ...planned, exerciseId: 'row', sets: 4, weight: 50 }],
  }

  it('lays out every planned exercise with its rows ready', () => {
    const session = buildSession(routine, plan, makeId, '2026-03-02T10:00:00.000Z')
    expect(session.routineId).toBe('rt-1')
    expect(session.routineName).toBe('Upper A')
    expect(session.startedAt).toBe('2026-03-02T10:00:00.000Z')
    expect(session.exercises.map((e) => e.sets.length)).toEqual([3, 4])
    expect(session.finishedAt).toBeUndefined()
  })

  it('keeps the prescription alongside the rows', () => {
    const session = buildSession(routine, plan, makeId, '2026-03-02T10:00:00.000Z')
    expect(session.exercises[0]?.planned).toEqual(planned)
  })

  it('builds an empty freestyle session with no routine', () => {
    const session = buildSession(null, null, makeId, '2026-03-02T10:00:00.000Z')
    expect(session.exercises).toEqual([])
    expect(session.routineId).toBeUndefined()
    expect(session.routineName).toBeUndefined()
  })
})
