import type { AppData, Exercise, Routine, Settings, Unit } from '../types'
import { SCHEMA_VERSION } from './schema'

/**
 * Exercise defaults, expressed in kg. `buildSeed` converts the increments when
 * the user starts out in pounds.
 *
 * Rep ranges follow the usual pattern: low ranges on heavy compounds where
 * adding weight is cheap, higher ranges on isolation work where it isn't.
 */
type SeedExercise = Omit<Exercise, 'id' | 'custom' | 'archived'>

const SEED_EXERCISES: SeedExercise[] = [
  // Barbell compounds
  { name: 'Back Squat', muscleGroup: 'quads', equipment: 'barbell', sets: 3, repMin: 5, repMax: 8, increment: 5, restSeconds: 180 },
  { name: 'Bench Press', muscleGroup: 'chest', equipment: 'barbell', sets: 3, repMin: 5, repMax: 8, increment: 2.5, restSeconds: 180 },
  { name: 'Deadlift', muscleGroup: 'hamstrings', equipment: 'barbell', sets: 3, repMin: 4, repMax: 6, increment: 5, restSeconds: 210 },
  { name: 'Overhead Press', muscleGroup: 'shoulders', equipment: 'barbell', sets: 3, repMin: 5, repMax: 8, increment: 2.5, restSeconds: 150 },
  { name: 'Barbell Row', muscleGroup: 'back', equipment: 'barbell', sets: 3, repMin: 6, repMax: 10, increment: 2.5, restSeconds: 150 },
  { name: 'Front Squat', muscleGroup: 'quads', equipment: 'barbell', sets: 3, repMin: 5, repMax: 8, increment: 2.5, restSeconds: 180 },
  { name: 'Romanian Deadlift', muscleGroup: 'hamstrings', equipment: 'barbell', sets: 3, repMin: 8, repMax: 12, increment: 5, restSeconds: 150 },
  { name: 'Hip Thrust', muscleGroup: 'glutes', equipment: 'barbell', sets: 3, repMin: 8, repMax: 12, increment: 5, restSeconds: 120 },

  // Dumbbell
  { name: 'Incline Dumbbell Press', muscleGroup: 'chest', equipment: 'dumbbell', sets: 3, repMin: 8, repMax: 12, increment: 2, restSeconds: 120 },
  { name: 'Dumbbell Shoulder Press', muscleGroup: 'shoulders', equipment: 'dumbbell', sets: 3, repMin: 8, repMax: 12, increment: 2, restSeconds: 120 },
  { name: 'Dumbbell Row', muscleGroup: 'back', equipment: 'dumbbell', sets: 3, repMin: 8, repMax: 12, increment: 2, restSeconds: 120 },
  { name: 'Bulgarian Split Squat', muscleGroup: 'quads', equipment: 'dumbbell', sets: 3, repMin: 8, repMax: 12, increment: 2, restSeconds: 120 },
  { name: 'Dumbbell Curl', muscleGroup: 'biceps', equipment: 'dumbbell', sets: 3, repMin: 8, repMax: 12, increment: 2, restSeconds: 90 },
  { name: 'Lateral Raise', muscleGroup: 'shoulders', equipment: 'dumbbell', sets: 3, repMin: 12, repMax: 15, increment: 1, restSeconds: 75 },
  { name: 'Dumbbell Lunge', muscleGroup: 'glutes', equipment: 'dumbbell', sets: 3, repMin: 8, repMax: 12, increment: 2, restSeconds: 120 },

  // Machine / cable
  { name: 'Lat Pulldown', muscleGroup: 'back', equipment: 'cable', sets: 3, repMin: 8, repMax: 12, increment: 2.5, restSeconds: 120 },
  { name: 'Seated Cable Row', muscleGroup: 'back', equipment: 'cable', sets: 3, repMin: 8, repMax: 12, increment: 2.5, restSeconds: 120 },
  { name: 'Leg Press', muscleGroup: 'quads', equipment: 'machine', sets: 3, repMin: 8, repMax: 12, increment: 5, restSeconds: 150 },
  { name: 'Leg Curl', muscleGroup: 'hamstrings', equipment: 'machine', sets: 3, repMin: 10, repMax: 15, increment: 2.5, restSeconds: 90 },
  { name: 'Leg Extension', muscleGroup: 'quads', equipment: 'machine', sets: 3, repMin: 10, repMax: 15, increment: 2.5, restSeconds: 90 },
  { name: 'Cable Triceps Pushdown', muscleGroup: 'triceps', equipment: 'cable', sets: 3, repMin: 10, repMax: 15, increment: 2.5, restSeconds: 75 },
  { name: 'Cable Face Pull', muscleGroup: 'shoulders', equipment: 'cable', sets: 3, repMin: 12, repMax: 15, increment: 2.5, restSeconds: 75 },
  { name: 'Chest Fly', muscleGroup: 'chest', equipment: 'machine', sets: 3, repMin: 10, repMax: 15, increment: 2.5, restSeconds: 90 },
  { name: 'Calf Raise', muscleGroup: 'calves', equipment: 'machine', sets: 4, repMin: 10, repMax: 15, increment: 2.5, restSeconds: 75 },

  // Bodyweight (loadable — log added weight, or 0 for bodyweight only)
  { name: 'Pull-up', muscleGroup: 'back', equipment: 'bodyweight', sets: 3, repMin: 5, repMax: 10, increment: 2.5, restSeconds: 150 },
  { name: 'Dip', muscleGroup: 'triceps', equipment: 'bodyweight', sets: 3, repMin: 6, repMax: 12, increment: 2.5, restSeconds: 150 },
  { name: 'Push-up', muscleGroup: 'chest', equipment: 'bodyweight', sets: 3, repMin: 10, repMax: 20, increment: 2.5, restSeconds: 90 },
  { name: 'Plank', muscleGroup: 'core', equipment: 'bodyweight', sets: 3, repMin: 30, repMax: 60, increment: 2.5, restSeconds: 60, notes: 'Log reps as seconds held.' },
  { name: 'Hanging Leg Raise', muscleGroup: 'core', equipment: 'bodyweight', sets: 3, repMin: 8, repMax: 15, increment: 2.5, restSeconds: 90 },
]

/** Starter programs. Names are matched against the seeded exercises above. */
const SEED_ROUTINES: { name: string; exercises: string[] }[] = [
  {
    name: 'Upper A',
    exercises: ['Bench Press', 'Barbell Row', 'Dumbbell Shoulder Press', 'Lat Pulldown', 'Dumbbell Curl', 'Cable Triceps Pushdown'],
  },
  {
    name: 'Lower A',
    exercises: ['Back Squat', 'Romanian Deadlift', 'Leg Press', 'Leg Curl', 'Calf Raise', 'Hanging Leg Raise'],
  },
  {
    name: 'Upper B',
    exercises: ['Overhead Press', 'Pull-up', 'Incline Dumbbell Press', 'Seated Cable Row', 'Lateral Raise', 'Cable Face Pull'],
  },
  {
    name: 'Lower B',
    exercises: ['Deadlift', 'Front Squat', 'Bulgarian Split Squat', 'Hip Thrust', 'Leg Extension', 'Plank'],
  },
]

export const DEFAULT_SETTINGS: Settings = {
  unit: 'kg',
  weeklyTarget: 4,
  deloadFraction: 0.1,
  stallLimit: 2,
  restTimerEnabled: true,
}

const LB_PER_KG = 2.20462

/** Sensible pound-denominated increments, rather than converted decimals. */
function toPoundIncrement(kg: number): number {
  if (kg <= 1) return 2.5
  if (kg <= 2) return 5
  if (kg <= 2.5) return 5
  return 10
}

export function buildSeed(unit: Unit): AppData {
  const exercises: Exercise[] = SEED_EXERCISES.map((seed, i) => ({
    ...seed,
    id: `ex-${i + 1}`,
    increment: unit === 'lb' ? toPoundIncrement(seed.increment) : seed.increment,
    custom: false,
    archived: false,
  }))

  const byName = new Map(exercises.map((e) => [e.name, e.id]))
  const routines: Routine[] = SEED_ROUTINES.map((seed, i) => ({
    id: `rt-${i + 1}`,
    name: seed.name,
    exerciseIds: seed.exercises.flatMap((name) => {
      const id = byName.get(name)
      return id ? [id] : []
    }),
    custom: false,
    archived: false,
  }))

  return {
    schemaVersion: SCHEMA_VERSION,
    settings: { ...DEFAULT_SETTINGS, unit },
    exercises,
    routines,
    sessions: [],
    activeSession: null,
    lastBackup: null,
  }
}

export function kgToLb(kg: number): number {
  return kg * LB_PER_KG
}

export function lbToKg(lb: number): number {
  return lb / LB_PER_KG
}
