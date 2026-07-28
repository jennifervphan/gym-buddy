import { describe, expect, it } from 'vitest'
import { buildExercises } from './seed'
import { filterExercises } from './search'

const library = buildExercises('kg')
const names = (query: string) => filterExercises(library, query).map((e) => e.name)

describe('filterExercises', () => {
  it('returns everything for an empty query', () => {
    expect(filterExercises(library, '')).toHaveLength(library.length)
    expect(filterExercises(library, '   ')).toHaveLength(library.length)
  })

  it('matches part of a name', () => {
    // Library order, not alphabetical — the caller decides how to sort.
    expect(names('squat')).toEqual(['Back Squat', 'Front Squat', 'Bulgarian Split Squat'])
  })

  it('ignores case', () => {
    expect(names('DEADLIFT')).toEqual(names('deadlift'))
    expect(names('deadlift')).toContain('Romanian Deadlift')
  })

  it('finds exercises by muscle group', () => {
    expect(names('chest')).toContain('Bench Press')
    expect(names('adductors')).toEqual(['Hip Adduction'])
  })

  it('finds exercises by equipment', () => {
    const cables = names('cable')
    expect(cables).toContain('Lat Pulldown')
    expect(cables).toContain('Seated Cable Row')
    expect(cables).not.toContain('Back Squat')
  })

  it('requires every term, so terms narrow the results', () => {
    const barbell = names('barbell')
    const barbellChest = names('barbell chest')
    expect(barbellChest.length).toBeLessThan(barbell.length)
    expect(barbellChest).toEqual(['Bench Press'])
  })

  it('does not care about the order of terms', () => {
    expect(names('barbell chest')).toEqual(names('chest barbell'))
  })

  it('tolerates extra whitespace', () => {
    expect(names('  bench   press  ')).toEqual(['Bench Press'])
  })

  it('returns nothing when there is no match', () => {
    expect(names('zercher')).toEqual([])
  })

  it('preserves the order it was given', () => {
    const reversed = [...library].reverse()
    expect(filterExercises(reversed, 'squat').map((e) => e.name)).toEqual(
      ['Back Squat', 'Front Squat', 'Bulgarian Split Squat'].reverse(),
    )
  })
})
