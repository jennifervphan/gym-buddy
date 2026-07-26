import { describe, expect, it } from 'vitest'
import { formatBest, formatClock, formatDuration, formatRelativeDate, formatVolume } from './format'

describe('formatVolume', () => {
  it('shows whole numbers below the compact threshold', () => {
    expect(formatVolume(4820, 'kg')).toBe('4,820 kg')
  })

  it('compacts large volumes', () => {
    expect(formatVolume(12400, 'kg')).toBe('12.4k kg')
  })
})

describe('formatDuration', () => {
  it('shows minutes under an hour', () => {
    expect(formatDuration('2026-03-02T10:00:00Z', '2026-03-02T10:48:00Z')).toBe('48m')
  })

  it('shows hours and minutes past an hour', () => {
    expect(formatDuration('2026-03-02T10:00:00Z', '2026-03-02T11:12:00Z')).toBe('1h 12m')
  })

  it('has nothing to show for an unfinished session', () => {
    expect(formatDuration('2026-03-02T10:00:00Z')).toBe('—')
  })
})

describe('formatClock', () => {
  it('pads seconds', () => {
    expect(formatClock(65)).toBe('1:05')
    expect(formatClock(9)).toBe('0:09')
  })

  it('floors at zero rather than going negative', () => {
    expect(formatClock(-5)).toBe('0:00')
  })
})

describe('formatRelativeDate', () => {
  const now = new Date(2026, 2, 12, 18, 0, 0)

  it('names today and yesterday', () => {
    expect(formatRelativeDate(new Date(2026, 2, 12, 7, 0).toISOString(), now)).toBe('Today')
    expect(formatRelativeDate(new Date(2026, 2, 11, 22, 0).toISOString(), now)).toBe('Yesterday')
  })

  it('counts days within the week', () => {
    expect(formatRelativeDate(new Date(2026, 2, 8).toISOString(), now)).toBe('4 days ago')
  })

  it('rolls up to weeks', () => {
    expect(formatRelativeDate(new Date(2026, 2, 4).toISOString(), now)).toBe('Last week')
    expect(formatRelativeDate(new Date(2026, 1, 12).toISOString(), now)).toBe('4 weeks ago')
  })
})

describe('formatBest', () => {
  it('shows weight and reps for a loaded lift', () => {
    expect(formatBest(60, 6, 'kg')).toBe('60 kg × 6')
  })

  it('shows reps alone for bodyweight work', () => {
    expect(formatBest(0, 12, 'kg')).toBe('12 reps')
  })

  it('has nothing to show without reps', () => {
    expect(formatBest(0, 0, 'kg')).toBe('—')
  })
})
