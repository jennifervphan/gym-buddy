import type { AppData, BackupRecord } from '../types'

/**
 * Training history lives only in this browser's storage, so it is one cleared
 * cache — or one Safari storage eviction — away from being gone. These rules
 * decide when it is worth interrupting the user to suggest an export.
 */
export const BACKUP_RULES = {
  /** Below this, there is not yet enough logged to be worth protecting. */
  minSessions: 3,
  /** Sessions logged since the last backup before nudging again. */
  sessionsSinceBackup: 8,
  /** Days since the last backup before nudging, given anything new to save. */
  daysSinceBackup: 30,
}

const DAY_MS = 24 * 60 * 60 * 1000

export function finishedSessionCount(data: AppData): number {
  return data.sessions.filter((s) => s.finishedAt).length
}

/** Finished sessions logged since the last export. */
export function sessionsSinceBackup(data: AppData): number {
  const total = finishedSessionCount(data)
  if (!data.lastBackup) return total
  return Math.max(0, total - data.lastBackup.sessionCount)
}

export function daysSinceBackup(data: AppData, now = new Date()): number | null {
  if (!data.lastBackup) return null
  const elapsed = now.getTime() - new Date(data.lastBackup.at).getTime()
  return Math.max(0, Math.floor(elapsed / DAY_MS))
}

/**
 * True when the user has enough unsaved history that losing the device's
 * storage would actually hurt.
 */
export function shouldPromptBackup(data: AppData, now = new Date()): boolean {
  const total = finishedSessionCount(data)
  if (total < BACKUP_RULES.minSessions) return false

  const unsaved = sessionsSinceBackup(data)
  if (unsaved === 0) return false
  if (!data.lastBackup) return true
  if (unsaved >= BACKUP_RULES.sessionsSinceBackup) return true

  const days = daysSinceBackup(data, now)
  return days !== null && days >= BACKUP_RULES.daysSinceBackup
}

export function backupRecord(data: AppData, now = new Date()): BackupRecord {
  return { at: now.toISOString(), sessionCount: finishedSessionCount(data) }
}
