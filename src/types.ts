/** Weights are stored as plain numbers in whichever unit `Settings.unit` names. */
export type Unit = 'kg' | 'lb'

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'adductors'
  | 'biceps'
  | 'triceps'
  | 'calves'
  | 'core'

export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight'

/**
 * An exercise plus the double-progression rules the planner uses for it.
 *
 * Double progression: hold the weight until every working set reaches
 * `repMax`, then add `increment` and drop back to `repMin`.
 */
export type Exercise = {
  id: string
  name: string
  muscleGroup: MuscleGroup
  equipment: Equipment
  /** Working sets to perform each session. */
  sets: number
  repMin: number
  repMax: number
  /** How much weight to add when the top of the rep range is cleared. */
  increment: number
  /** Seconds of rest between working sets. */
  restSeconds: number
  /** True for exercises the user added themselves. */
  custom: boolean
  archived: boolean
  notes?: string
}

export type SetKind = 'working' | 'warmup'

export type LoggedSet = {
  id: string
  kind: SetKind
  weight: number
  reps: number
}

export type LoggedExercise = {
  exerciseId: string
  /** What the planner asked for, kept so history explains itself later. */
  planned: PlannedExercise | null
  sets: LoggedSet[]
  notes?: string
}

export type Session = {
  id: string
  /** ISO timestamp for when the session was started. */
  startedAt: string
  /** ISO timestamp; absent while the session is still in progress. */
  finishedAt?: string
  routineId?: string
  routineName?: string
  exercises: LoggedExercise[]
  bodyweight?: number
  notes?: string
}

export type Routine = {
  id: string
  name: string
  exerciseIds: string[]
  custom: boolean
  archived: boolean
}

export type ProgressionKind =
  | 'first-time'
  | 'add-weight'
  | 'add-reps'
  | 'finish-sets'
  | 'repeat'
  | 'deload'

/** The planner's prescription for one exercise in the next session. */
export type PlannedExercise = {
  exerciseId: string
  sets: number
  /** null the very first time an exercise is performed — nothing to go on yet. */
  weight: number | null
  /** Reps to aim for on every working set. */
  repTarget: number
  repMin: number
  repMax: number
  kind: ProgressionKind
  /** One-line explanation shown next to the prescription. */
  reason: string
}

export type PlannedSession = {
  routineId: string
  routineName: string
  exercises: PlannedExercise[]
}

export type Settings = {
  unit: Unit
  /** Sessions per week the user is aiming for; drives the consistency streak. */
  weeklyTarget: number
  /** Fraction to cut when an exercise stalls twice, e.g. 0.1 for 10%. */
  deloadFraction: number
  /** Consecutive failed sessions at one weight before deloading. */
  stallLimit: number
  restTimerEnabled: boolean
}

/** When the user last exported a backup, used to nudge them before too much is at risk. */
export type BackupRecord = {
  at: string
  /** Finished sessions at the time of the export. */
  sessionCount: number
}

export type AppData = {
  schemaVersion: number
  settings: Settings
  exercises: Exercise[]
  routines: Routine[]
  sessions: Session[]
  /** The in-progress session, if any. Kept separate from history. */
  activeSession: Session | null
  lastBackup: BackupRecord | null
}
