import type { AppData, Session, Unit } from '../types'
import { SCHEMA_VERSION, STORAGE_KEY } from './schema'
import { DEFAULT_SETTINGS, buildSeed, kgToLb, lbToKg } from './seed'
import { roundWeight } from './progression'

export { SCHEMA_VERSION, STORAGE_KEY } from './schema'

/**
 * Brings a stored payload up to the current schema. Only version 1 exists so
 * far; later versions add their steps here in order.
 */
/**
 * v1 → v2 dropped the unused `rpe` field from logged sets. Stripping it keeps
 * exports clean rather than carrying a key nothing reads.
 */
function stripLegacySetFields(session: Session): Session {
  return {
    ...session,
    exercises: session.exercises.map((entry) => ({
      ...entry,
      sets: entry.sets.map(({ id, kind, weight, reps }) => ({ id, kind, weight, reps })),
    })),
  }
}

export function migrate(raw: unknown): AppData | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Partial<AppData>
  if (!Array.isArray(data.exercises) || !Array.isArray(data.sessions)) return null

  return {
    schemaVersion: SCHEMA_VERSION,
    settings: { ...DEFAULT_SETTINGS, ...(data.settings ?? {}) },
    exercises: data.exercises,
    routines: Array.isArray(data.routines) ? data.routines : [],
    sessions: data.sessions.map(stripLegacySetFields),
    activeSession: data.activeSession ? stripLegacySetFields(data.activeSession) : null,
    lastBackup: data.lastBackup ?? null,
  }
}

/** Reads saved data, falling back to a freshly seeded library. */
export function load(): AppData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const migrated = migrate(JSON.parse(stored))
      if (migrated) return migrated
    }
  } catch {
    // Corrupt or unreadable storage shouldn't leave the user with a blank app.
  }
  return buildSeed(detectDefaultUnit())
}

export function save(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Quota exceeded or private-mode storage: keep running from memory.
  }
}

/** Pounds for US locales, kilograms everywhere else. */
function detectDefaultUnit(): Unit {
  try {
    const locale = navigator.language ?? 'en-GB'
    return /-(US|MM|LR)$/i.test(locale) ? 'lb' : 'kg'
  } catch {
    return 'kg'
  }
}

/**
 * Rewrites every stored weight into a new unit so the numbers on screen keep
 * meaning the same thing after a unit switch.
 */
export function convertUnits(data: AppData, to: Unit): AppData {
  const from = data.settings.unit
  if (from === to) return data
  const convert = (value: number) => roundWeight(to === 'lb' ? kgToLb(value) : lbToKg(value))
  // Increments are rounded to whole/half steps so they stay usable as plate jumps.
  const convertIncrement = (value: number) => {
    const raw = to === 'lb' ? kgToLb(value) : lbToKg(value)
    return Math.max(0.5, Math.round(raw * 2) / 2)
  }

  const convertSession = (s: Session): Session => ({
    ...s,
    ...(s.bodyweight === undefined ? {} : { bodyweight: convert(s.bodyweight) }),
    exercises: s.exercises.map((entry) => ({
      ...entry,
      planned: entry.planned
        ? {
            ...entry.planned,
            weight: entry.planned.weight === null ? null : convert(entry.planned.weight),
          }
        : null,
      sets: entry.sets.map((set) => ({ ...set, weight: convert(set.weight) })),
    })),
  })

  return {
    ...data,
    settings: { ...data.settings, unit: to },
    exercises: data.exercises.map((e) => ({ ...e, increment: convertIncrement(e.increment) })),
    sessions: data.sessions.map(convertSession),
    activeSession: data.activeSession ? convertSession(data.activeSession) : null,
  }
}

export function exportJSON(data: AppData): string {
  return JSON.stringify({ ...data, exportedAt: new Date().toISOString() }, null, 2)
}

export type ImportResult = { ok: true; data: AppData } | { ok: false; error: string }

export function importJSON(text: string): ImportResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: "That file isn't valid JSON." }
  }
  const data = migrate(parsed)
  if (!data) {
    return { ok: false, error: "That doesn't look like a Gym Buddy backup." }
  }
  return { ok: true, data }
}
