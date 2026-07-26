import type { Equipment, MuscleGroup, ProgressionKind, Unit } from '../types'

/** Trims trailing zeros so 62.50 reads as 62.5 and 60.00 as 60. */
export function formatNumber(value: number, maxDecimals = 2): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: maxDecimals })
}

export function formatWeight(value: number, unit: Unit): string {
  return `${formatNumber(value)} ${unit}`
}

/**
 * A best set as "60 kg × 6", or just "12 reps" for bodyweight work where the
 * load is always zero.
 */
export function formatBest(weight: number, reps: number, unit: Unit): string {
  if (reps <= 0) return '—'
  return weight > 0 ? `${formatWeight(weight, unit)} × ${reps}` : `${reps} reps`
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
  const then = new Date(iso)
  const days = Math.floor((startOfDay(now) - startOfDay(then)) / 86_400_000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 14) return 'Last week'
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`
  return formatShortDate(iso)
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
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

export const MUSCLE_GROUPS = Object.keys(MUSCLE_GROUP_LABELS) as MuscleGroup[]
export const EQUIPMENT = Object.keys(EQUIPMENT_LABELS) as Equipment[]
