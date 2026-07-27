import { describe, expect, it } from 'vitest'
import type { AppData, Session } from '../types'
import { buildSeed } from './seed'
import { SCHEMA_VERSION } from './schema'
import { convertUnits, exportJSON, importJSON, migrate } from './storage'

function seeded(): AppData {
  return buildSeed('kg')
}

const session: Session = {
  id: 'sess-1',
  startedAt: '2026-03-02T10:00:00.000Z',
  finishedAt: '2026-03-02T11:00:00.000Z',
  bodyweight: 70,
  exercises: [
    {
      exerciseId: 'ex-2',
      planned: {
        exerciseId: 'ex-2',
        sets: 3,
        weight: 60,
        repTarget: 8,
        repMin: 5,
        repMax: 8,
        kind: 'add-reps',
        reason: 'test',
      },
      sets: [
        { id: 's1', kind: 'warmup', weight: 20, reps: 10 },
        { id: 's2', kind: 'working', weight: 60, reps: 8 },
      ],
    },
  ],
}

describe('buildSeed', () => {
  it('seeds a usable library and routines', () => {
    const data = seeded()
    expect(data.exercises.length).toBeGreaterThan(20)
    expect(data.routines).toHaveLength(4)
    expect(data.sessions).toEqual([])
    expect(data.activeSession).toBeNull()
    expect(data.schemaVersion).toBe(SCHEMA_VERSION)
  })

  it('wires every routine to real exercises', () => {
    const data = seeded()
    const ids = new Set(data.exercises.map((e) => e.id))
    for (const routine of data.routines) {
      expect(routine.exerciseIds.length).toBeGreaterThan(0)
      for (const id of routine.exerciseIds) expect(ids.has(id)).toBe(true)
    }
  })

  it('gives every exercise a coherent rep range', () => {
    for (const exercise of seeded().exercises) {
      expect(exercise.repMin).toBeLessThan(exercise.repMax)
      expect(exercise.sets).toBeGreaterThan(0)
      expect(exercise.increment).toBeGreaterThan(0)
    }
  })

  it('uses pound-friendly increments when seeded in pounds', () => {
    for (const exercise of buildSeed('lb').exercises) {
      expect([2.5, 5, 10]).toContain(exercise.increment)
    }
  })
})

describe('migrate', () => {
  it('rejects values that are not app data', () => {
    expect(migrate(null)).toBeNull()
    expect(migrate('nope')).toBeNull()
    expect(migrate({})).toBeNull()
    expect(migrate({ exercises: [] })).toBeNull()
  })

  it('fills in missing settings and collections with defaults', () => {
    const data = migrate({ exercises: [], sessions: [] })
    expect(data).toMatchObject({ schemaVersion: SCHEMA_VERSION, routines: [], activeSession: null })
    expect(data?.settings.unit).toBe('kg')
    expect(data?.settings.weeklyTarget).toBe(4)
  })

  it('keeps settings that are present', () => {
    const data = migrate({ exercises: [], sessions: [], settings: { unit: 'lb', weeklyTarget: 3 } })
    expect(data?.settings).toMatchObject({ unit: 'lb', weeklyTarget: 3, stallLimit: 2 })
  })
})

describe('convertUnits', () => {
  const data: AppData = { ...seeded(), sessions: [session], activeSession: session }

  it('is a no-op when the unit is unchanged', () => {
    expect(convertUnits(data, 'kg')).toBe(data)
  })

  it('rewrites logged weights, planned weights and bodyweight', () => {
    const converted = convertUnits(data, 'lb')
    const entry = converted.sessions[0]?.exercises[0]
    expect(converted.settings.unit).toBe('lb')
    expect(entry?.sets[1]?.weight).toBeCloseTo(132.28, 1)
    expect(entry?.planned?.weight).toBeCloseTo(132.28, 1)
    expect(converted.sessions[0]?.bodyweight).toBeCloseTo(154.32, 1)
  })

  it('converts the in-progress session too', () => {
    const converted = convertUnits(data, 'lb')
    expect(converted.activeSession?.exercises[0]?.sets[1]?.weight).toBeCloseTo(132.28, 1)
  })

  it('keeps increments on usable half-unit steps', () => {
    for (const exercise of convertUnits(data, 'lb').exercises) {
      expect(exercise.increment % 0.5).toBe(0)
      expect(exercise.increment).toBeGreaterThan(0)
    }
  })

  it('round-trips back to roughly the original weights', () => {
    const back = convertUnits(convertUnits(data, 'lb'), 'kg')
    expect(back.sessions[0]?.exercises[0]?.sets[1]?.weight).toBeCloseTo(60, 1)
  })

  it('leaves a null planned weight alone', () => {
    const unplanned: Session = {
      ...session,
      exercises: [{ exerciseId: 'ex-1', planned: null, sets: [] }],
    }
    const converted = convertUnits({ ...seeded(), sessions: [unplanned] }, 'lb')
    expect(converted.sessions[0]?.exercises[0]?.planned).toBeNull()
  })
})

describe('export and import', () => {
  it('round-trips through JSON', () => {
    const data: AppData = { ...seeded(), sessions: [session] }
    const result = importJSON(exportJSON(data))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.sessions).toEqual([session])
      expect(result.data.exercises).toEqual(data.exercises)
    }
  })

  it('explains malformed JSON', () => {
    const result = importJSON('{ not json')
    expect(result).toEqual({ ok: false, error: "That file isn't valid JSON." })
  })

  it('explains JSON that is not a backup', () => {
    const result = importJSON('{"hello":"world"}')
    expect(result.ok).toBe(false)
  })
})

describe('migrating from schema v1', () => {
  const v1 = {
    schemaVersion: 1,
    settings: { unit: 'kg' },
    exercises: [],
    sessions: [
      {
        id: 'old',
        startedAt: '2026-01-05T10:00:00.000Z',
        finishedAt: '2026-01-05T11:00:00.000Z',
        exercises: [
          { exerciseId: 'ex-2', planned: null, sets: [{ id: 's1', kind: 'working', weight: 60, reps: 8, rpe: 9 }] },
        ],
      },
    ],
  }

  it('drops the retired rpe field from logged sets', () => {
    const migrated = migrate(v1)
    const set = migrated?.sessions[0]?.exercises[0]?.sets[0]
    expect(set).toEqual({ id: 's1', kind: 'working', weight: 60, reps: 8 })
    expect(set).not.toHaveProperty('rpe')
  })

  it('keeps everything else about the set intact', () => {
    const migrated = migrate(v1)
    expect(migrated?.sessions[0]?.id).toBe('old')
    expect(migrated?.schemaVersion).toBe(SCHEMA_VERSION)
  })

  it('cleans an in-progress session too', () => {
    const migrated = migrate({ ...v1, activeSession: { ...v1.sessions[0], id: 'live' } })
    expect(migrated?.activeSession?.exercises[0]?.sets[0]).not.toHaveProperty('rpe')
  })

  it('defaults the backup record for data that predates it', () => {
    expect(migrate(v1)?.lastBackup).toBeNull()
  })

  it('preserves an existing backup record', () => {
    const record = { at: '2026-03-01T00:00:00.000Z', sessionCount: 4 }
    expect(migrate({ ...v1, lastBackup: record })?.lastBackup).toEqual(record)
  })
})
