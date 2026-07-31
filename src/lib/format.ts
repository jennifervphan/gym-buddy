import type { Equipment, Exercise, Metric, MuscleGroup, ProgressionKind, Unit } from '../types'

/** Trims trailing zeros so 62.50 reads as 62.5 and 60.00 as 60. */
export function formatNumber(value: number, maxDecimals = 2): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: maxDecimals })
}

export function formatWeight(value: number, unit: Unit): string {
  return `${formatNumber(value)} ${unit}`
}

/**
 * Reads a number the user may still be typing.
 *
 * Accepts a comma as the decimal separator, since that is what many locales'
 * keypads produce, and returns null for anything not yet a number — "", ".",
 * "-" — so a half-typed entry is never committed as the wrong value.
 */
export function parseDecimalInput(text: string, integer = false): number | null {
  const normalised = text.trim().replace(',', '.')
  if (normalised === '') return null
  if (!(integer ? /^\d+$/ : /^\d*\.?\d*$/).test(normalised)) return null
  const value = Number(normalised)
  return Number.isFinite(value) ? value : null
}

/** "8 reps" or "45s", depending on what the exercise counts. */
export function formatCount(value: number, metric: Metric = 'reps'): string {
  return metric === 'seconds' ? `${value}s` : `${value} ${value === 1 ? 'rep' : 'reps'}`
}

/** The bare count for tight spots — "8" for reps, "45s" for a hold. */
export function formatCountShort(value: number, metric: Metric = 'reps'): string {
  return metric === 'seconds' ? `${value}s` : String(value)
}

/** Column heading for the logged number. */
export function countLabel(metric: Metric = 'reps'): string {
  return metric === 'seconds' ? 'Secs' : 'Reps'
}

/** "reps" or "seconds", so prose matches what the exercise counts. */
export function countNoun(metric: Metric = 'reps'): string {
  return metric === 'seconds' ? 'seconds' : 'reps'
}

/** An exercise's prescription at a glance: "3×8–12", or "3×20–45s" for a hold. */
export function formatSetRange(
  exercise: Pick<Exercise, 'sets' | 'repMin' | 'repMax' | 'metric'>,
): string {
  return `${exercise.sets}×${exercise.repMin}–${exercise.repMax}${
    exercise.metric === 'seconds' ? 's' : ''
  }`
}

/**
 * A best set as "60 kg × 6", or just the count for bodyweight work where the
 * load is always zero.
 */
export function formatBest(weight: number, reps: number, unit: Unit, metric: Metric = 'reps'): string {
  if (reps <= 0) return '—'
  return weight > 0
    ? `${formatWeight(weight, unit)} × ${formatCountShort(reps, metric)}`
    : formatCount(reps, metric)
}

/**
 * The planner's prescription: "3 × 8 @ 60 kg", or "3 × 45s" where there is no
 * load to name and "@ 0 kg" would just be noise.
 */
export function formatPrescription(
  sets: number,
  target: number,
  weight: number,
  unit: Unit,
  metric: Metric = 'reps',
): string {
  const work = `${sets} × ${formatCountShort(target, metric)}`
  return weight > 0 ? `${work} @ ${formatWeight(weight, unit)}` : `${work} at bodyweight`
}

/** Compact volume, e.g. "12.4k kg", for stat tiles where space is tight. */
export function formatVolume(value: number, unit: Unit): string {
  if (value >= 10000) return `${formatNumber(value / 1000, 1)}k ${unit}`
  return `${formatNumber(Math.round(value))} ${unit}`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

/** "Today", "Yesterday", "4 days ago", then falls back to a date. */
export function formatRelativeDate(iso: string, now = new Date()): string {
  const days = calendarDaysBetween(new Date(iso), now)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 14) return 'Last week'
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`
  return formatShortDate(iso)
}

/**
 * Whole calendar days from `from` to `to`.
 *
 * The local calendar dates are re-anchored in UTC before subtracting, because
 * a day that spans a daylight-saving change is 23 or 25 hours long — dividing
 * real elapsed time by 24 hours reports one day too few across a spring
 * forward.
 */
function calendarDaysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate())
  return Math.round((b - a) / 86_400_000)
}

/** Session length as "1h 12m", or "48m" under an hour. */
export function formatDuration(startedAt: string, finishedAt?: string): string {
  if (!finishedAt) return '—'
  const minutes = Math.round((new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 60_000)
  if (minutes < 60) return `${minutes}m`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds))
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`
}

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  adductors: 'Adductors',
  biceps: 'Biceps',
  triceps: 'Triceps',
  calves: 'Calves',
  core: 'Core',
}

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  machine: 'Machine',
  cable: 'Cable',
  bodyweight: 'Bodyweight',
}

/** Short badge text for the planner's decision. */
export const PROGRESSION_LABELS: Record<ProgressionKind, string> = {
  'first-time': 'New lift',
  'add-weight': 'Add weight',
  'add-reps': 'Add reps',
  'finish-sets': 'Finish sets',
  repeat: 'Repeat',
  deload: 'Deload',
}

/** The planner's decision, worded for what the exercise actually counts. */
export function progressionLabel(kind: ProgressionKind, metric: Metric = 'reps'): string {
  if (metric === 'seconds' && kind === 'add-reps') return 'Add time'
  return PROGRESSION_LABELS[kind]
}

export const MUSCLE_GROUPS = Object.keys(MUSCLE_GROUP_LABELS) as MuscleGroup[]
export const EQUIPMENT = Object.keys(EQUIPMENT_LABELS) as Equipment[]
