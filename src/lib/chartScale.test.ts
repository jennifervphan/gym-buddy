import { describe, expect, it } from 'vitest'
import { barPath, niceTicks, niceTicksInRange } from './chartScale'

describe('niceTicks', () => {
  it('produces round steps covering the range', () => {
    expect(niceTicks(95, 4)).toEqual([0, 25, 50, 75, 100])
  })

  it('scales across magnitudes', () => {
    expect(niceTicks(9500, 3)).toEqual([0, 5000, 10000])
    expect(niceTicks(0.9, 3)).toEqual([0, 0.5, 1])
  })

  it('always starts at the baseline', () => {
    expect(niceTicks(7)[0]).toBe(0)
  })

  it('falls back to a usable axis for an empty range', () => {
    expect(niceTicks(0)).toEqual([0, 1])
    expect(niceTicks(-5)).toEqual([0, 1])
  })

  it('covers the maximum value', () => {
    for (const max of [3, 17, 42, 199, 1234, 87654]) {
      expect(Math.max(...niceTicks(max))).toBeGreaterThanOrEqual(max)
    }
  })
})

describe('barPath', () => {
  it('starts and ends on the baseline so bars sit flush', () => {
    const path = barPath(10, 20, 24, 60)
    expect(path.startsWith('M10,80')).toBe(true)
    expect(path.endsWith('L34,80 Z')).toBe(true)
  })

  it('never rounds more than half the bar width', () => {
    // A 4px-wide bar would otherwise produce overlapping corner curves.
    expect(barPath(0, 0, 4, 50)).toContain('L0,2')
  })

  it('never rounds more than the bar height', () => {
    expect(barPath(0, 98, 24, 2)).toContain('L0,100')
  })
})

describe('niceTicksInRange', () => {
  it('steps across a domain that does not start at zero', () => {
    // A strength curve sitting between 57 and 76 needs ticks inside that band,
    // not 0/25/50/75 counted up from zero.
    expect(niceTicksInRange(57, 76)).toEqual([60, 65, 70, 75])
  })

  it('keeps every tick inside the domain', () => {
    for (const [min, max] of [[57, 76], [0, 9], [980, 1620], [0.2, 0.9]] as const) {
      for (const tick of niceTicksInRange(min, max)) {
        expect(tick).toBeGreaterThanOrEqual(min)
        expect(tick).toBeLessThanOrEqual(max)
      }
    }
  })

  it('scales to large domains', () => {
    expect(niceTicksInRange(980, 1620)).toEqual([1000, 1200, 1400, 1600])
  })

  it('still produces at least two ticks on a very narrow domain', () => {
    expect(niceTicksInRange(99.9, 100.1).length).toBeGreaterThanOrEqual(2)
  })

  it('collapses to a single value for an empty domain', () => {
    expect(niceTicksInRange(50, 50)).toEqual([50])
    expect(niceTicksInRange(60, 40)).toEqual([60])
  })
})
