import { describe, expect, it } from 'vitest'
import type { Exercise, LoggedSet, Session } from '../types'
import {
  bestSet,
  bodyweightSeries,
  estimate1RM,
  recordsFor,
  seriesFor,
  sessionVolume,
  sessionWorkingSets,
  sessionsThisWeek,
  stalePrescriptions,
  volumeByMuscleGroup,
  weekStart,
  weeklyStreak,
  weeklySummaries,
} from './stats'

let counter = 0
function set(weight: number, reps: number, kind: LoggedSet['kind'] = 'working'): LoggedSet {
  counter += 1
  return { id: `s${counter}`, kind, weight, reps }
}

function sessionOn(
  isoDate: string,
  exercises: { exerciseId: string; sets: LoggedSet[] }[],
  finished = true,
): Session {
  return {
    id: `sess-${isoDate}-${counter}`,
    startedAt: `${isoDate}T10:00:00.000Z`,
    ...(finished ? { finishedAt: `${isoDate}T11:00:00.000Z` } : {}),
    exercises: exercises.map((e) => ({ exerciseId: e.exerciseId, planned: null, sets: e.sets })),
  }
}

describe('estimate1RM', () => {
  it('returns the weight itself for a single', () => {
    expect(estimate1RM(100, 1)).toBe(100)
  })

  it('applies the Epley formula for multi-rep sets', () => {
    expect(estimate1RM(100, 5)).toBeCloseTo(116.67, 2)
    expect(estimate1RM(60, 8)).toBeCloseTo(76, 2)
  })

  it('caps the rep count so high-rep sets do not inflate the estimate', () => {
    expect(estimate1RM(50, 20)).toBe(estimate1RM(50, 12))
  })

  it('returns zero for bodyweight or empty sets', () => {
    expect(estimate1RM(0, 10)).toBe(0)
    expect(estimate1RM(100, 0)).toBe(0)
  })
})

describe('sessionVolume and sessionWorkingSets', () => {
  const session = sessionOn('2026-03-02', [
    { exerciseId: 'bench', sets: [set(40, 10, 'warmup'), set(60, 8), set(60, 6)] },
    { exerciseId: 'row', sets: [set(50, 10), set(50, 0)] },
  ])

  it('counts working sets only', () => {
    expect(sessionVolume(session)).toBe(60 * 8 + 60 * 6 + 50 * 10)
  })

  it('ignores warmups and empty sets in the set count', () => {
    expect(sessionWorkingSets(session)).toBe(3)
  })
})

describe('bestSet', () => {
  it('picks the set with the highest estimated 1RM, not the heaviest', () => {
    const best = bestSet([set(100, 1), set(90, 5)])
    expect(best).toMatchObject({ weight: 90, reps: 5 })
  })

  it('returns null when there is nothing to compare', () => {
    expect(bestSet([set(60, 8, 'warmup')])).toBeNull()
  })
})

describe('recordsFor', () => {
  const sessions = [
    sessionOn('2026-01-05', [{ exerciseId: 'bench', sets: [set(60, 8), set(60, 8)] }]),
    sessionOn('2026-01-12', [{ exerciseId: 'bench', sets: [set(80, 3), set(70, 6)] }]),
    sessionOn('2026-01-19', [{ exerciseId: 'squat', sets: [set(100, 5)] }]),
    sessionOn('2026-01-26', [{ exerciseId: 'bench', sets: [set(65, 8), set(65, 8), set(65, 8)] }], false),
  ]

  it('returns null for an exercise that was never trained', () => {
    expect(recordsFor(sessions, 'deadlift')).toBeNull()
  })

  it('collects bests across sessions and ignores unfinished ones', () => {
    const records = recordsFor(sessions, 'bench')
    expect(records).toMatchObject({
      heaviestWeight: 80,
      sessionCount: 2,
      lastPerformed: '2026-01-12T10:00:00.000Z',
    })
    // 80x3 estimates 88, ahead of 70x6 at 84 and 60x8 at 76.
    expect(records?.bestSetWeight).toBe(80)
    expect(records?.bestSetReps).toBe(3)
    expect(records?.best1RM).toBeCloseTo(88, 1)
  })

  it('tracks the best single-session volume', () => {
    expect(recordsFor(sessions, 'bench')?.bestSessionVolume).toBe(960)
  })
})

describe('seriesFor', () => {
  it('returns one oldest-first point per session', () => {
    const series = seriesFor(
      [
        sessionOn('2026-02-10', [{ exerciseId: 'bench', sets: [set(65, 8), set(65, 7)] }]),
        sessionOn('2026-02-03', [{ exerciseId: 'bench', sets: [set(60, 8), set(60, 8)] }]),
        sessionOn('2026-02-17', [{ exerciseId: 'squat', sets: [set(100, 5)] }]),
      ],
      'bench',
    )
    expect(series.map((p) => p.topWeight)).toEqual([60, 65])
    expect(series[1]).toMatchObject({ volume: 65 * 15, totalReps: 15 })
  })

  it('carries the best single set, the only curve unloaded work can move', () => {
    const series = seriesFor(
      [
        sessionOn('2026-02-03', [{ exerciseId: 'plank', sets: [set(0, 30), set(0, 28)] }]),
        sessionOn('2026-02-10', [{ exerciseId: 'plank', sets: [set(0, 35), set(0, 40)] }]),
      ],
      'plank',
    )
    expect(series.map((p) => p.bestCount)).toEqual([30, 40])
    // Everything else is flat zero without load, which is the point.
    expect(series.map((p) => p.topWeight)).toEqual([0, 0])
    expect(series.map((p) => p.estimated1RM)).toEqual([0, 0])
  })
})

describe('weekStart', () => {
  it('anchors to the Monday of the containing week', () => {
    expect(weekStart(new Date('2026-03-04T12:00:00.000Z'))).toBe('2026-03-02')
  })

  it('treats Monday as the start of its own week', () => {
    expect(weekStart(new Date('2026-03-02T00:00:00.000Z'))).toBe('2026-03-02')
  })

  it('keeps Sunday in the week that began the previous Monday', () => {
    expect(weekStart(new Date('2026-03-08T23:00:00.000Z'))).toBe('2026-03-02')
  })
})

describe('weeklySummaries', () => {
  it('groups finished sessions into Monday-anchored weeks', () => {
    const summaries = weeklySummaries([
      sessionOn('2026-03-02', [{ exerciseId: 'bench', sets: [set(60, 8)] }]),
      sessionOn('2026-03-05', [{ exerciseId: 'bench', sets: [set(60, 8)] }]),
      sessionOn('2026-03-10', [{ exerciseId: 'bench', sets: [set(60, 8)] }]),
      sessionOn('2026-03-11', [{ exerciseId: 'bench', sets: [set(60, 8)] }], false),
    ])
    expect(summaries).toEqual([
      { weekStart: '2026-03-02', sessions: 2, volume: 960, workingSets: 2 },
      { weekStart: '2026-03-09', sessions: 1, volume: 480, workingSets: 1 },
    ])
  })
})

describe('weeklyStreak', () => {
  const now = new Date('2026-03-12T12:00:00.000Z') // Thursday of the 2026-03-09 week

  function week(monday: string, count: number): Session[] {
    return Array.from({ length: count }, (_, i) => {
      const day = new Date(`${monday}T10:00:00.000Z`)
      day.setUTCDate(day.getUTCDate() + i)
      return sessionOn(day.toISOString().slice(0, 10), [{ exerciseId: 'bench', sets: [set(60, 8)] }])
    })
  }

  it('is zero with no history', () => {
    expect(weeklyStreak([], 2, now)).toBe(0)
  })

  it('counts back over consecutive weeks that hit the target', () => {
    const sessions = [...week('2026-02-23', 2), ...week('2026-03-02', 2), ...week('2026-03-09', 2)]
    expect(weeklyStreak(sessions, 2, now)).toBe(3)
  })

  it('does not break the streak when the current week is still short', () => {
    const sessions = [...week('2026-02-23', 2), ...week('2026-03-02', 2), ...week('2026-03-09', 1)]
    expect(weeklyStreak(sessions, 2, now)).toBe(2)
  })

  it('stops at a completed week that missed the target', () => {
    const sessions = [...week('2026-02-23', 2), ...week('2026-03-02', 1), ...week('2026-03-09', 2)]
    expect(weeklyStreak(sessions, 2, now)).toBe(1)
  })

  it('is zero when the weekly target is zero', () => {
    expect(weeklyStreak(week('2026-03-09', 3), 0, now)).toBe(0)
  })
})

describe('sessionsThisWeek', () => {
  it('counts only finished sessions in the current week', () => {
    const now = new Date('2026-03-12T12:00:00.000Z')
    const sessions = [
      sessionOn('2026-03-09', [{ exerciseId: 'bench', sets: [set(60, 8)] }]),
      sessionOn('2026-03-11', [{ exerciseId: 'bench', sets: [set(60, 8)] }]),
      sessionOn('2026-03-12', [{ exerciseId: 'bench', sets: [set(60, 8)] }], false),
      sessionOn('2026-03-06', [{ exerciseId: 'bench', sets: [set(60, 8)] }]),
    ]
    expect(sessionsThisWeek(sessions, now)).toBe(2)
  })
})

const bench: Exercise = {
  id: 'bench',
  name: 'Bench Press',
  muscleGroup: 'chest',
  equipment: 'barbell',
  sets: 3,
  metric: 'reps',
  repMin: 5,
  repMax: 8,
  increment: 2.5,
  restSeconds: 180,
  custom: false,
  archived: false,
}
const row: Exercise = { ...bench, id: 'row', name: 'Barbell Row', muscleGroup: 'back' }
const fly: Exercise = { ...bench, id: 'fly', name: 'Chest Fly', muscleGroup: 'chest' }

describe('volumeByMuscleGroup', () => {
  const now = new Date('2026-03-12T12:00:00.000Z')

  it('sums by muscle group within the window, busiest first', () => {
    const sessions = [
      sessionOn('2026-03-10', [
        { exerciseId: 'bench', sets: [set(60, 8), set(60, 8)] },
        { exerciseId: 'row', sets: [set(50, 10)] },
      ]),
      sessionOn('2026-03-05', [{ exerciseId: 'fly', sets: [set(20, 12)] }]),
    ]
    expect(volumeByMuscleGroup(sessions, [bench, row, fly], 28, now)).toEqual([
      { muscleGroup: 'chest', volume: 60 * 16 + 240, sets: 3 },
      { muscleGroup: 'back', volume: 500, sets: 1 },
    ])
  })

  it('excludes sessions older than the window', () => {
    const sessions = [sessionOn('2026-01-01', [{ exerciseId: 'bench', sets: [set(60, 8)] }])]
    expect(volumeByMuscleGroup(sessions, [bench], 28, now)).toEqual([])
  })
})

describe('stalePrescriptions', () => {
  const now = new Date('2026-03-12T12:00:00.000Z')

  it('flags exercises not trained inside the window', () => {
    const sessions = [
      sessionOn('2026-01-10', [{ exerciseId: 'row', sets: [set(50, 10)] }]),
      sessionOn('2026-03-10', [{ exerciseId: 'bench', sets: [set(60, 8)] }]),
    ]
    const stale = stalePrescriptions(sessions, [bench, row], 21, now)
    expect(stale.map((s) => s.exercise.id)).toEqual(['row'])
  })

  it('does not flag exercises that were never started', () => {
    expect(stalePrescriptions([], [bench, row], 21, now)).toEqual([])
  })

  it('ignores archived exercises', () => {
    const sessions = [sessionOn('2026-01-10', [{ exerciseId: 'row', sets: [set(50, 10)] }])]
    expect(stalePrescriptions(sessions, [{ ...row, archived: true }], 21, now)).toEqual([])
  })
})

describe('bestSet for bodyweight work', () => {
  it('ranks by reps when every set estimates to zero', () => {
    const best = bestSet([set(0, 8), set(0, 14), set(0, 11)])
    expect(best?.reps).toBe(14)
  })

  it('reports the best rep count in the records', () => {
    const sessions = [
      sessionOn('2026-03-02', [{ exerciseId: 'pullup', sets: [set(0, 8), set(0, 12)] }]),
      sessionOn('2026-03-09', [{ exerciseId: 'pullup', sets: [set(0, 10)] }]),
    ]
    const records = recordsFor(sessions, 'pullup')
    expect(records?.bestSetReps).toBe(12)
    expect(records?.best1RM).toBe(0)
  })
})

describe('bodyweightSeries', () => {
  function weighed(isoDate: string, bodyweight?: number, finished = true): Session {
    return {
      id: `bw-${isoDate}`,
      startedAt: `${isoDate}T10:00:00.000Z`,
      ...(finished ? { finishedAt: `${isoDate}T11:00:00.000Z` } : {}),
      ...(bodyweight === undefined ? {} : { bodyweight }),
      exercises: [],
    }
  }

  it('returns recorded weights oldest first', () => {
    const series = bodyweightSeries([weighed('2026-03-09', 71), weighed('2026-03-02', 70.5)])
    expect(series.map((p) => p.weight)).toEqual([70.5, 71])
  })

  it('skips sessions where bodyweight was left blank', () => {
    expect(bodyweightSeries([weighed('2026-03-02'), weighed('2026-03-09', 70)])).toHaveLength(1)
  })

  it('treats a zero as unrecorded rather than a real weight', () => {
    expect(bodyweightSeries([weighed('2026-03-02', 0)])).toEqual([])
  })

  it('ignores unfinished sessions', () => {
    expect(bodyweightSeries([weighed('2026-03-02', 70, false)])).toEqual([])
  })
})
