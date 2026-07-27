import { describe, expect, it } from 'vitest'
import type { AppData, Session } from '../types'
import { buildSeed } from './seed'
import {
  backupRecord,
  daysSinceBackup,
  finishedSessionCount,
  sessionsSinceBackup,
  shouldPromptBackup,
} from './backup'

const NOW = new Date('2026-03-12T12:00:00.000Z')

function sessions(count: number, finished = true): Session[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `s${i}`,
    startedAt: `2026-02-${String((i % 28) + 1).padStart(2, '0')}T10:00:00.000Z`,
    ...(finished ? { finishedAt: `2026-02-${String((i % 28) + 1).padStart(2, '0')}T11:00:00.000Z` } : {}),
    exercises: [],
  }))
}

function data(count: number, lastBackup: AppData['lastBackup'] = null): AppData {
  return { ...buildSeed('kg'), sessions: sessions(count), lastBackup }
}

describe('finishedSessionCount', () => {
  it('ignores a session still in progress', () => {
    const withLive: AppData = {
      ...buildSeed('kg'),
      sessions: [...sessions(2), ...sessions(1, false)],
    }
    expect(finishedSessionCount(withLive)).toBe(2)
  })
})

describe('sessionsSinceBackup', () => {
  it('counts everything when nothing was ever backed up', () => {
    expect(sessionsSinceBackup(data(5))).toBe(5)
  })

  it('counts only what came after the last backup', () => {
    expect(sessionsSinceBackup(data(9, { at: NOW.toISOString(), sessionCount: 4 }))).toBe(5)
  })

  it('never goes negative if sessions were deleted after a backup', () => {
    expect(sessionsSinceBackup(data(2, { at: NOW.toISOString(), sessionCount: 6 }))).toBe(0)
  })
})

describe('daysSinceBackup', () => {
  it('is null when there is no backup', () => {
    expect(daysSinceBackup(data(3))).toBeNull()
  })

  it('counts whole days elapsed', () => {
    expect(daysSinceBackup(data(3, { at: '2026-03-02T12:00:00.000Z', sessionCount: 1 }), NOW)).toBe(10)
  })

  it('does not go negative for a clock skewed into the future', () => {
    expect(daysSinceBackup(data(3, { at: '2026-04-01T12:00:00.000Z', sessionCount: 1 }), NOW)).toBe(0)
  })
})

describe('shouldPromptBackup', () => {
  it('stays quiet until there is enough history to be worth saving', () => {
    expect(shouldPromptBackup(data(0), NOW)).toBe(false)
    expect(shouldPromptBackup(data(2), NOW)).toBe(false)
  })

  it('prompts once there is history and no backup at all', () => {
    expect(shouldPromptBackup(data(3), NOW)).toBe(true)
  })

  it('stays quiet right after a backup', () => {
    const justSaved = data(6, { at: NOW.toISOString(), sessionCount: 6 })
    expect(shouldPromptBackup(justSaved, NOW)).toBe(false)
  })

  it('stays quiet for a handful of new sessions', () => {
    const recent = data(9, { at: '2026-03-10T12:00:00.000Z', sessionCount: 6 })
    expect(shouldPromptBackup(recent, NOW)).toBe(false)
  })

  it('prompts once enough new sessions have piled up', () => {
    const stale = data(14, { at: '2026-03-10T12:00:00.000Z', sessionCount: 6 })
    expect(shouldPromptBackup(stale, NOW)).toBe(true)
  })

  it('prompts when the backup is old, even with only one new session', () => {
    const old = data(7, { at: '2026-01-05T12:00:00.000Z', sessionCount: 6 })
    expect(shouldPromptBackup(old, NOW)).toBe(true)
  })

  it('stays quiet on an old backup if nothing new was logged', () => {
    const old = data(6, { at: '2026-01-05T12:00:00.000Z', sessionCount: 6 })
    expect(shouldPromptBackup(old, NOW)).toBe(false)
  })
})

describe('backupRecord', () => {
  it('captures the moment and the session count', () => {
    expect(backupRecord(data(7), NOW)).toEqual({ at: NOW.toISOString(), sessionCount: 7 })
  })

  it('records a count that immediately silences the prompt', () => {
    const before = data(12)
    const after: AppData = { ...before, lastBackup: backupRecord(before, NOW) }
    expect(shouldPromptBackup(after, NOW)).toBe(false)
  })
})
