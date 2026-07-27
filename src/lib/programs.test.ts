import { describe, expect, it } from 'vitest'
import type { Exercise, Routine, Session } from '../types'
import { buildSeed } from './seed'
import {
  PROGRAMS,
  buildProgramRoutines,
  nextRoutineForFocus,
  routineFocus,
} from './programs'

const seed = buildSeed('kg')
const library = seed.exercises

function routineOf(names: string[]): Routine {
  const byName = new Map(library.map((e) => [e.name, e.id]))
  return {
    id: 'r',
    name: 'test',
    exerciseIds: names.map((n) => byName.get(n)!),
    custom: false,
    archived: false,
  }
}

describe('PROGRAMS', () => {
  it('only references exercises that exist in the seeded library', () => {
    const names = new Set(library.map((e) => e.name))
    for (const program of PROGRAMS) {
      for (const day of program.days) {
        for (const name of day.exercises) {
          expect(names.has(name), `${program.name} → ${day.name} → ${name}`).toBe(true)
        }
      }
    }
  })

  it('gives every program distinct days with exercises', () => {
    for (const program of PROGRAMS) {
      expect(program.days.length).toBe(program.daysPerWeek)
      expect(new Set(program.days.map((d) => d.name)).size).toBe(program.days.length)
      for (const day of program.days) {
        expect(day.exercises.length).toBeGreaterThan(0)
        // A day must not list the same exercise twice.
        expect(new Set(day.exercises).size).toBe(day.exercises.length)
      }
    }
  })

  it('has unique program ids', () => {
    expect(new Set(PROGRAMS.map((p) => p.id)).size).toBe(PROGRAMS.length)
  })
})

describe('routineFocus', () => {
  it('classifies an upper day', () => {
    expect(routineFocus(routineOf(['Bench Press', 'Barbell Row', 'Dumbbell Curl']), library)).toBe('upper')
  })

  it('classifies a lower day', () => {
    expect(routineFocus(routineOf(['Back Squat', 'Leg Curl', 'Calf Raise']), library)).toBe('lower')
  })

  it('ignores core work when deciding', () => {
    expect(routineFocus(routineOf(['Back Squat', 'Leg Press', 'Plank']), library)).toBe('lower')
    expect(routineFocus(routineOf(['Bench Press', 'Lat Pulldown', 'Hanging Leg Raise']), library)).toBe('upper')
  })

  it('does not let a single deadlift turn a pull day into a lower day', () => {
    expect(
      routineFocus(routineOf(['Deadlift', 'Pull-up', 'Barbell Row', 'Dumbbell Curl']), library),
    ).toBe('upper')
  })

  it('classifies a genuinely mixed day as full body', () => {
    expect(
      routineFocus(routineOf(['Back Squat', 'Romanian Deadlift', 'Bench Press', 'Barbell Row']), library),
    ).toBe('full')
  })

  it('treats an empty or unknown routine as full body', () => {
    expect(routineFocus({ ...routineOf([]), exerciseIds: [] }, library)).toBe('full')
    expect(routineFocus({ ...routineOf([]), exerciseIds: ['ghost'] }, library)).toBe('full')
  })

  it('classifies every seeded routine as upper or lower', () => {
    const focuses = seed.routines.map((r) => routineFocus(r, library))
    expect(focuses).toEqual(['upper', 'lower', 'upper', 'lower'])
  })

  it('classifies each shipped program day as intended', () => {
    const focusOf = (programId: string, dayName: string) => {
      const program = PROGRAMS.find((p) => p.id === programId)!
      const day = program.days.find((d) => d.name === dayName)!
      return routineFocus(routineOf(day.exercises), library)
    }
    expect(focusOf('push-pull-legs', 'Push')).toBe('upper')
    expect(focusOf('push-pull-legs', 'Pull')).toBe('upper')
    expect(focusOf('push-pull-legs', 'Legs')).toBe('lower')
    expect(focusOf('upper-lower-2', 'Upper Body')).toBe('upper')
    expect(focusOf('upper-lower-2', 'Lower Body')).toBe('lower')
    for (const day of PROGRAMS.find((p) => p.id === 'full-body-3')!.days) {
      expect(routineFocus(routineOf(day.exercises), library), day.name).toBe('full')
    }
  })
})

describe('nextRoutineForFocus', () => {
  const routines = seed.routines // Upper A, Lower A, Upper B, Lower B

  function done(routineId: string, isoDate: string): Session {
    return {
      id: `s-${routineId}-${isoDate}`,
      startedAt: `${isoDate}T10:00:00.000Z`,
      finishedAt: `${isoDate}T11:00:00.000Z`,
      routineId,
      exercises: [],
    }
  }

  it('offers the first matching routine when nothing has been trained', () => {
    expect(nextRoutineForFocus(routines, library, [], 'upper')?.name).toBe('Upper A')
    expect(nextRoutineForFocus(routines, library, [], 'lower')?.name).toBe('Lower A')
  })

  it('alternates to the other routine of the same focus', () => {
    const sessions = [done(routines[0]!.id, '2026-03-02')] // Upper A
    expect(nextRoutineForFocus(routines, library, sessions, 'upper')?.name).toBe('Upper B')
    // The lower rotation is untouched by an upper session.
    expect(nextRoutineForFocus(routines, library, sessions, 'lower')?.name).toBe('Lower A')
  })

  it('cycles back once both have been trained', () => {
    const sessions = [done(routines[0]!.id, '2026-03-02'), done(routines[2]!.id, '2026-03-05')]
    expect(nextRoutineForFocus(routines, library, sessions, 'upper')?.name).toBe('Upper A')
  })

  it('uses the most recent session for a routine, not the first', () => {
    const sessions = [
      done(routines[0]!.id, '2026-03-02'), // Upper A
      done(routines[2]!.id, '2026-03-05'), // Upper B
      done(routines[0]!.id, '2026-03-09'), // Upper A again, now the most recent
    ]
    expect(nextRoutineForFocus(routines, library, sessions, 'upper')?.name).toBe('Upper B')
  })

  it('ignores unfinished sessions', () => {
    const live: Session = { id: 'x', startedAt: '2026-03-09T10:00:00.000Z', routineId: routines[0]!.id, exercises: [] }
    expect(nextRoutineForFocus(routines, library, [live], 'upper')?.name).toBe('Upper A')
  })

  it('skips archived and empty routines', () => {
    const trimmed = [
      { ...routines[0]!, archived: true },
      { ...routines[2]!, exerciseIds: [] },
      routines[1]!,
    ]
    expect(nextRoutineForFocus(trimmed, library, [], 'upper')).toBeNull()
    expect(nextRoutineForFocus(trimmed, library, [], 'lower')?.name).toBe('Lower A')
  })

  it('returns null when no routine matches the focus', () => {
    expect(nextRoutineForFocus(routines, library, [], 'full')).toBeNull()
  })
})

describe('buildProgramRoutines', () => {
  let n = 0
  const makeId = () => `new-${++n}`

  it('builds one routine per day, wired to real exercise ids', () => {
    const program = PROGRAMS.find((p) => p.id === 'push-pull-legs')!
    const { routines } = buildProgramRoutines(program, library, makeId)
    const ids = new Set(library.map((e) => e.id))

    expect(routines.map((r) => r.name)).toEqual(['Push', 'Pull', 'Legs'])
    for (const routine of routines) {
      expect(routine.exerciseIds.length).toBe(6)
      for (const id of routine.exerciseIds) expect(ids.has(id)).toBe(true)
    }
  })

  it('flags archived exercises so they can be restored', () => {
    const withArchived: Exercise[] = library.map((e) =>
      e.name === 'Bench Press' ? { ...e, archived: true } : e,
    )
    const program = PROGRAMS.find((p) => p.id === 'upper-lower-2')!
    const { routines, unarchive } = buildProgramRoutines(program, withArchived, makeId)

    const bench = library.find((e) => e.name === 'Bench Press')!
    expect(unarchive).toEqual([bench.id])
    // It is still included in the routine, not silently dropped.
    expect(routines[0]?.exerciseIds).toContain(bench.id)
  })

  it('skips exercises the library does not have', () => {
    const sparse = library.filter((e) => e.name !== 'Bench Press')
    const program = PROGRAMS.find((p) => p.id === 'upper-lower-2')!
    const { routines } = buildProgramRoutines(program, sparse, makeId)
    expect(routines[0]?.exerciseIds).toHaveLength(5)
  })

  it('matches exercise names regardless of case', () => {
    const renamed = library.map((e) =>
      e.name === 'Bench Press' ? { ...e, name: 'BENCH PRESS' } : e,
    )
    const program = PROGRAMS.find((p) => p.id === 'upper-lower-2')!
    const { routines } = buildProgramRoutines(program, renamed, makeId)
    expect(routines[0]?.exerciseIds).toHaveLength(6)
  })
})
