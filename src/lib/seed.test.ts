import { describe, expect, it } from 'vitest'
import type { Exercise } from '../types'
import { buildExercises, buildSeed, mergeBuiltInExercises } from './seed'

describe('the built-in library', () => {
  const library = buildExercises('kg')

  it('includes both hip machines, distinctly named', () => {
    const names = library.map((e) => e.name)
    expect(names).toContain('Hip Abduction')
    expect(names).toContain('Hip Adduction')
  })

  it('puts abduction on the glutes and adduction on the adductors', () => {
    expect(library.find((e) => e.name === 'Hip Abduction')?.muscleGroup).toBe('glutes')
    expect(library.find((e) => e.name === 'Hip Adduction')?.muscleGroup).toBe('adductors')
  })

  it('explains which machine is which, since the names are easy to confuse', () => {
    for (const name of ['Hip Abduction', 'Hip Adduction']) {
      expect(library.find((e) => e.name === name)?.notes).toBeTruthy()
    }
  })

  it('has no duplicate names or ids', () => {
    expect(new Set(library.map((e) => e.name)).size).toBe(library.length)
    expect(new Set(library.map((e) => e.id)).size).toBe(library.length)
  })
})

describe('mergeBuiltInExercises', () => {
  const full = buildExercises('kg')

  it('is a no-op when the library is already complete', () => {
    expect(mergeBuiltInExercises(full, 'kg')).toBe(full)
  })

  it('adds built-ins that an older library is missing', () => {
    const old = full.filter((e) => !e.name.startsWith('Hip Ab') && !e.name.startsWith('Hip Add'))
    const merged = mergeBuiltInExercises(old, 'kg')
    expect(merged).toHaveLength(old.length + 2)
    expect(merged.map((e) => e.name)).toContain('Hip Abduction')
    expect(merged.map((e) => e.name)).toContain('Hip Adduction')
  })

  it('never reuses an id already in the library', () => {
    const old = full.slice(0, 20)
    const merged = mergeBuiltInExercises(old, 'kg')
    expect(new Set(merged.map((e) => e.id)).size).toBe(merged.length)
  })

  it('leaves existing exercises untouched, including edits and archives', () => {
    const edited: Exercise[] = full
      .filter((e) => e.name !== 'Hip Abduction')
      .map((e) => (e.name === 'Bench Press' ? { ...e, repMax: 3, archived: true } : e))
    const merged = mergeBuiltInExercises(edited, 'kg')
    const bench = merged.find((e) => e.name === 'Bench Press')
    expect(bench).toMatchObject({ repMax: 3, archived: true })
  })

  it('does not re-add an exercise the user archived', () => {
    const archived = full.map((e) => ({ ...e, archived: true }))
    expect(mergeBuiltInExercises(archived, 'kg')).toHaveLength(full.length)
  })

  it('matches names case-insensitively so a re-cased name is not duplicated', () => {
    const recased = full.map((e) => (e.name === 'Hip Adduction' ? { ...e, name: 'HIP ADDUCTION' } : e))
    expect(mergeBuiltInExercises(recased, 'kg')).toHaveLength(full.length)
  })

  it('denominates additions in the library\'s own unit', () => {
    const old = full.filter((e) => e.name !== 'Hip Abduction')
    const merged = mergeBuiltInExercises(old, 'lb')
    expect(merged.find((e) => e.name === 'Hip Abduction')?.increment).toBe(10)
  })

  it('repopulates an empty library', () => {
    expect(mergeBuiltInExercises([], 'kg')).toHaveLength(full.length)
  })

  it('keeps a user\'s own exercises', () => {
    const custom: Exercise = { ...full[0]!, id: 'mine', name: 'Zercher Squat', custom: true }
    const merged = mergeBuiltInExercises([custom], 'kg')
    expect(merged.find((e) => e.id === 'mine')?.name).toBe('Zercher Squat')
    expect(merged).toHaveLength(full.length + 1)
  })
})

describe('buildSeed still wires up correctly', () => {
  it('keeps every routine pointing at real exercises', () => {
    const data = buildSeed('kg')
    const ids = new Set(data.exercises.map((e) => e.id))
    for (const routine of data.routines) {
      for (const id of routine.exerciseIds) expect(ids.has(id)).toBe(true)
    }
  })
})

describe('upgrading a real legacy library', () => {
  const full = buildExercises('kg')

  it('does not collide with a contiguously numbered pre-hip-machine install', () => {
    // Before the hip machines existed the seed produced 29 exercises numbered
    // ex-1..ex-29, so the new entries' own seed ids are already taken.
    const legacy = full
      .filter((e) => !e.name.startsWith('Hip A'))
      .map((e, i) => ({ ...e, id: `ex-${i + 1}` }))
    expect(legacy).toHaveLength(29)

    const merged = mergeBuiltInExercises(legacy, 'kg')
    expect(new Set(merged.map((e) => e.id)).size).toBe(merged.length)
    expect(merged.filter((e) => e.name.startsWith('Hip A')).map((e) => e.id)).toEqual(['ex-30', 'ex-31'])
    // Every pre-existing exercise keeps the id its logged history points at.
    for (const e of legacy) expect(merged.find((m) => m.id === e.id)?.name).toBe(e.name)
  })
})

describe('form cues', () => {
  const library = buildExercises('kg')

  it('covers every built-in exercise', () => {
    const missing = library.filter((e) => !e.form).map((e) => e.name)
    expect(missing).toEqual([])
  })

  it('gives each one all three cues, as complete sentences', () => {
    for (const exercise of library) {
      const cues = exercise.form!
      for (const [key, text] of Object.entries(cues)) {
        expect(text.length, `${exercise.name}.${key}`).toBeGreaterThan(20)
        expect(text.endsWith('.'), `${exercise.name}.${key}`).toBe(true)
      }
    }
  })

  it('refreshes cues onto a library that predates them', () => {
    const old = library.map(({ form: _form, ...rest }) => rest)
    expect(old.every((e) => !('form' in e))).toBe(true)
    const merged = mergeBuiltInExercises(old, 'kg')
    expect(merged.every((e) => e.form)).toBe(true)
    expect(merged).toHaveLength(library.length)
  })

  it('refreshing cues leaves the user’s own edits alone', () => {
    const edited = library.map((e) =>
      e.name === 'Bench Press' ? { ...e, form: undefined, repMax: 3, notes: 'mine', archived: true } : e,
    )
    const bench = mergeBuiltInExercises(edited, 'kg').find((e) => e.name === 'Bench Press')
    expect(bench).toMatchObject({ repMax: 3, notes: 'mine', archived: true })
    expect(bench?.form?.setup).toContain('Eyes under the bar')
  })

  it('leaves a custom exercise without cues', () => {
    const custom = { ...library[0]!, id: 'mine', name: 'Zercher Squat', custom: true, form: undefined }
    const merged = mergeBuiltInExercises([custom], 'kg')
    expect(merged.find((e) => e.id === 'mine')?.form).toBeUndefined()
  })
})
