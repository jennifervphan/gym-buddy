import { useMemo, useState } from 'react'
import type { Exercise, LoggedExercise, LoggedSet, Metric, PlannedExercise } from '../types'
import { useStore } from '../state/context'
import {
  countLabel,
  countNoun,
  formatBest,
  formatPrescription,
  formatSetRange,
  formatWeight,
  progressionLabel,
  MUSCLE_GROUP_LABELS,
} from '../lib/format'
import { planExercise, warmupSets } from '../lib/progression'
import { filterExercises } from '../lib/search'
import { blankSets, unperformedLaterSetIds } from '../lib/session'
import { estimate1RM, recordsFor } from '../lib/stats'
import { FormCueList } from '../components/FormCueList'
import { MuscleMap } from '../components/MuscleMap'
import { NumberInput } from '../components/NumberInput'
import { RestTimer } from '../components/RestTimer'
import { Sheet } from '../components/Sheet'
import {
  IconAlert,
  IconArrowDown,
  IconArrowUp,
  IconCheck,
  IconPlus,
  IconRepeat,
  IconTrash,
  IconTrophy,
} from '../components/Icons'
import type { Route } from '../lib/useRoute'

function badgeClassFor(kind: PlannedExercise['kind']): string {
  switch (kind) {
    case 'add-weight':
      return 'badge up'
    case 'deload':
      return 'badge down'
    case 'repeat':
      return 'badge warn'
    default:
      return 'badge hold'
  }
}

function BadgeIcon({ kind }: { kind: PlannedExercise['kind'] }) {
  switch (kind) {
    case 'add-weight':
      return <IconArrowUp />
    case 'deload':
      return <IconArrowDown />
    case 'repeat':
      return <IconRepeat />
    default:
      return <IconCheck />
  }
}

export function Workout({ navigate }: { navigate: (route: Route) => void }) {
  const { data, dispatch } = useStore()
  const session = data.activeSession
  const [rest, setRest] = useState<{ endsAt: number; total: number } | null>(null)
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState('')
  const [confirmFinish, setConfirmFinish] = useState(false)

  const byId = useMemo(() => new Map(data.exercises.map((e) => [e.id, e])), [data.exercises])

  if (!session) {
    return (
      <div className="page">
        <div className="card empty">
          <strong>No session in progress</strong>
          <p className="muted">Start one from the home screen and it will show up here.</p>
          <button type="button" className="btn primary" onClick={() => navigate({ name: 'home' })}>
            Go to home
          </button>
        </div>
      </div>
    )
  }

  const loggedSets = session.exercises.reduce(
    (n, entry) => n + entry.sets.filter((s) => s.kind === 'working' && s.reps > 0).length,
    0,
  )

  const startRest = (seconds: number) => {
    if (!data.settings.restTimerEnabled) return
    setRest({ endsAt: Date.now() + seconds * 1000, total: seconds })
  }

  const finish = () => {
    dispatch({ type: 'finish-session', at: new Date().toISOString() })
    setConfirmFinish(false)
    navigate({ name: 'history' })
  }

  const available = data.exercises
    .filter((e) => !e.archived && !session.exercises.some((entry) => entry.exerciseId === e.id))
    .sort((a, b) => a.name.localeCompare(b.name))
  const matches = filterExercises(available, search)

  const closeAdding = () => {
    setAdding(false)
    setSearch('')
  }

  return (
    <div className="page">
      <div className="card">
        <div className="card-head">
          <div>
            <div className="section-title">In progress</div>
            <h1>{session.routineName ?? 'Freestyle session'}</h1>
          </div>
          <span className="badge">
            {loggedSets} {loggedSets === 1 ? 'set' : 'sets'}
          </span>
        </div>
        <div className="btn-row">
          <button type="button" className="btn primary" onClick={() => setConfirmFinish(true)}>
            <IconCheck /> Finish
          </button>
          <button type="button" className="btn ghost" onClick={() => setAdding(true)}>
            <IconPlus /> Add exercise
          </button>
        </div>
      </div>

      {session.exercises.map((entry, index) => {
        const exercise = byId.get(entry.exerciseId)
        if (!exercise) return null
        return (
          <ExerciseCard
            key={entry.exerciseId}
            entry={entry}
            exercise={exercise}
            index={index}
            count={session.exercises.length}
            onRest={() => startRest(exercise.restSeconds)}
          />
        )
      })}

      {session.exercises.length === 0 && (
        <div className="card empty">
          <strong>Nothing in this session yet</strong>
          <p className="muted">Add an exercise to get started.</p>
          <button type="button" className="btn primary" onClick={() => setAdding(true)}>
            <IconPlus /> Add exercise
          </button>
        </div>
      )}

      <div className="card">
        <div className="field">
          <label htmlFor="session-bodyweight">Bodyweight ({data.settings.unit})</label>
          <input
            id="session-bodyweight"
            className="input"
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder="Optional"
            value={session.bodyweight ?? ''}
            onChange={(e) =>
              dispatch({
                type: 'update-active-session',
                patch: { bodyweight: e.target.value === '' ? undefined : Number(e.target.value) },
              })
            }
          />
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <label htmlFor="session-notes">Session notes</label>
          <textarea
            id="session-notes"
            className="textarea"
            placeholder="How did it feel? Anything to remember for next time?"
            value={session.notes ?? ''}
            onChange={(e) => dispatch({ type: 'update-active-session', patch: { notes: e.target.value } })}
          />
        </div>
      </div>

      <button
        type="button"
        className="btn danger block"
        onClick={() => {
          if (window.confirm('Discard this session? Nothing will be saved.')) {
            dispatch({ type: 'discard-session' })
            navigate({ name: 'home' })
          }
        }}
      >
        <IconTrash /> Discard session
      </button>

      {rest && (
        <RestTimer
          endsAt={rest.endsAt}
          totalSeconds={rest.total}
          onDismiss={() => setRest(null)}
          onExtend={(seconds) =>
            setRest((current) =>
              current ? { endsAt: current.endsAt + seconds * 1000, total: current.total + seconds } : null,
            )
          }
        />
      )}

      {adding && (
        <Sheet
          title="Add exercise"
          onClose={closeAdding}
          subhead={
            <input
              className="input sheet-search"
              type="search"
              value={search}
              placeholder="Search name, muscle or equipment"
              aria-label="Search exercises"
              onChange={(e) => setSearch(e.target.value)}
            />
          }
        >
          <div className="card flush">
            <div className="list">
              {matches.map((exercise) => (
                <button
                  key={exercise.id}
                  type="button"
                  className="list-item"
                  onClick={() => {
                    const planned = planExercise(exercise, data.sessions, data.settings)
                    dispatch({
                      type: 'add-exercise',
                      exerciseId: exercise.id,
                      planned,
                      sets: blankSets(planned, () => crypto.randomUUID()),
                    })
                    closeAdding()
                  }}
                >
                  <div className="grow">
                    <div className="title">{exercise.name}</div>
                    <div className="muted-xs">
                      {MUSCLE_GROUP_LABELS[exercise.muscleGroup]} · {formatSetRange(exercise)}
                    </div>
                  </div>
                  <IconPlus className="chevron" />
                </button>
              ))}
              {matches.length === 0 && (
                <div className="empty">
                  <p className="muted">
                    {available.length === 0
                      ? 'Every exercise in your library is already in this session.'
                      : `Nothing matches “${search.trim()}”.`}
                  </p>
                  {available.length > 0 && (
                    <button type="button" className="btn sm" onClick={() => setSearch('')}>
                      Clear search
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </Sheet>
      )}

      {confirmFinish && (
        <Sheet title="Finish session" onClose={() => setConfirmFinish(false)}>
          {loggedSets === 0 ? (
            <p className="muted">
              You haven't logged any sets, so there's nothing to save. Finishing now will just close the
              session.
            </p>
          ) : (
            <p className="muted">
              Saving {loggedSets} {loggedSets === 1 ? 'set' : 'sets'}. Empty sets and untouched exercises
              are left out, and your next session's plan updates straight away.
            </p>
          )}
          <button type="button" className="btn primary block" onClick={finish}>
            <IconCheck /> {loggedSets === 0 ? 'Close session' : 'Save session'}
          </button>
        </Sheet>
      )}
    </div>
  )
}

/**
 * A 1RM estimate needs load to mean anything, so unloaded work — bodyweight
 * reps, timed holds — is judged on the count instead.
 */
function beatsRecord(set: LoggedSet, records: NonNullable<ReturnType<typeof recordsFor>>): boolean {
  return records.best1RM > 0
    ? estimate1RM(set.weight, set.reps) > records.best1RM
    : set.reps > records.bestSetReps
}

function ExerciseCard({
  entry,
  exercise,
  index,
  count,
  onRest,
}: {
  entry: LoggedExercise
  exercise: Exercise
  index: number
  count: number
  onRest: () => void
}) {
  const { data, dispatch } = useStore()
  const { unit } = data.settings
  const planned = entry.planned
  const records = useMemo(() => recordsFor(data.sessions, exercise.id), [data.sessions, exercise.id])
  const [showWarmup, setShowWarmup] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const working = entry.sets.filter((s) => s.kind === 'working')
  const warmups = entry.sets.filter((s) => s.kind === 'warmup')

  /**
   * New rows pre-fill from the previous set so logging straight sets is a
   * single tap, falling back to the plan for the first set of the session.
   */
  const addSet = (kind: LoggedSet['kind']) => {
    const previous = kind === 'working' ? working.at(-1) : warmups.at(-1)
    const weight = previous?.weight ?? (kind === 'working' ? planned?.weight ?? 0 : 0)
    dispatch({
      type: 'add-set',
      exerciseId: exercise.id,
      set: { id: crypto.randomUUID(), kind, weight, reps: 0 },
    })
  }

  const suggestedWarmups = warmupSets(planned?.weight ?? working.at(-1)?.weight ?? 0, exercise)

  return (
    <div className="card exercise-block">
      <div className="card-head" style={{ marginBottom: 0 }}>
        <div>
          <h2>
            <span className="order-pill">{index + 1}</span> {exercise.name}
          </h2>
          <div className="muted-xs">
            {MUSCLE_GROUP_LABELS[exercise.muscleGroup]} · {formatSetRange(exercise)}
          </div>
          {exercise.notes && (
            <div className="muted-xs" style={{ marginTop: 4 }}>
              {exercise.notes}
            </div>
          )}
        </div>
        <div className="head-actions">
          <button
            type="button"
            className="btn icon ghost"
            aria-label={`Move ${exercise.name} earlier`}
            disabled={index === 0}
            onClick={() => dispatch({ type: 'move-exercise', exerciseId: exercise.id, to: index - 1 })}
          >
            <IconArrowUp />
          </button>
          <button
            type="button"
            className="btn icon ghost"
            aria-label={`Move ${exercise.name} later`}
            disabled={index === count - 1}
            onClick={() => dispatch({ type: 'move-exercise', exerciseId: exercise.id, to: index + 1 })}
          >
            <IconArrowDown />
          </button>
          <button
            type="button"
            className="btn icon ghost"
            aria-label={`Remove ${exercise.name} from this session`}
            onClick={() => {
              if (entry.sets.length === 0 || window.confirm(`Remove ${exercise.name} and its sets?`)) {
                dispatch({ type: 'remove-exercise', exerciseId: exercise.id })
              }
            }}
          >
            <IconTrash />
          </button>
        </div>
      </div>

      {/* The machine you wanted may be busy — start with whatever is free. */}
      {index > 0 && (
        <button
          type="button"
          className="btn sm ghost"
          style={{ alignSelf: 'flex-start' }}
          onClick={() => dispatch({ type: 'move-exercise', exerciseId: exercise.id, to: 0 })}
        >
          <IconArrowUp /> Do this first
        </button>
      )}

      {planned && (
        <div className="prescription">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className={badgeClassFor(planned.kind)}>
              <BadgeIcon kind={planned.kind} /> {progressionLabel(planned.kind, exercise.metric)}
            </span>
            {records && (
              <span className="muted-xs">
                Best {formatBest(records.bestSetWeight, records.bestSetReps, unit, exercise.metric)}
              </span>
            )}
          </div>
          <div className="target">
            {planned.weight === null
              ? `${planned.sets} sets · ${planned.repMin}–${planned.repMax} ${countNoun(exercise.metric)}`
              : formatPrescription(
                  planned.sets,
                  planned.repTarget,
                  planned.weight,
                  unit,
                  exercise.metric,
                )}
          </div>
          <p className="reason">{planned.reason}</p>
        </div>
      )}

      <div className="btn-row">
        {suggestedWarmups.length > 0 && (
          <button
            type="button"
            className="btn sm ghost"
            onClick={() => setShowWarmup((v) => !v)}
            aria-expanded={showWarmup}
          >
            {showWarmup ? 'Hide' : 'Show'} suggested warmup
          </button>
        )}
        {exercise.form && (
          <button
            type="button"
            className="btn sm ghost"
            onClick={() => setShowForm((v) => !v)}
            aria-expanded={showForm}
          >
            {showForm ? 'Hide' : 'How to'} do it
          </button>
        )}
      </div>

      {showWarmup && suggestedWarmups.length > 0 && (
        <p className="muted-xs">
          {suggestedWarmups.map((w) => `${formatWeight(w.weight, unit)} × ${w.reps}`).join('  →  ')}
        </p>
      )}

      {showForm && exercise.form && (
        <div>
          <MuscleMap group={exercise.muscleGroup} />
          <div style={{ marginTop: 16 }}>
            <FormCueList cues={exercise.form} />
          </div>
        </div>
      )}

      {entry.sets.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="set-row header">
            <span>Set</span>
            <span>{unit}</span>
            <span>{countLabel(exercise.metric)}</span>
            <span />
          </div>
          {entry.sets.map((set, setIndex) => (
            <SetRow
              key={set.id}
              set={set}
              index={setIndex}
              exerciseId={exercise.id}
              metric={exercise.metric}
              onWeight={(weight) => {
                dispatch({ type: 'update-set', exerciseId: exercise.id, setId: set.id, patch: { weight } })
                // Sets you haven't done yet follow the weight you just entered.
                for (const id of unperformedLaterSetIds(entry.sets, set.id)) {
                  dispatch({ type: 'update-set', exerciseId: exercise.id, setId: id, patch: { weight } })
                }
              }}
              workingIndex={
                set.kind === 'working' ? working.findIndex((s) => s.id === set.id) + 1 : null
              }
              isRecord={
                set.kind === 'working' && set.reps > 0 && records !== null && beatsRecord(set, records)
              }
              onLogged={onRest}
            />
          ))}
        </div>
      )}

      <div className="btn-row">
        <button type="button" className="btn sm" onClick={() => addSet('working')}>
          <IconPlus /> Add set
        </button>
        <button type="button" className="btn sm ghost" onClick={() => addSet('warmup')}>
          Add warmup
        </button>
      </div>

      {planned?.kind === 'repeat' && (
        <p className="muted-xs" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <IconAlert style={{ width: 14, height: 14, flexShrink: 0 }} />
          Miss it again and the plan will cut the weight to get you moving.
        </p>
      )}

      <div className="field">
        <label htmlFor={`note-${exercise.id}`}>Notes</label>
        <input
          id={`note-${exercise.id}`}
          className="input"
          placeholder="Form cues, niggles, bar setup…"
          value={entry.notes ?? ''}
          onChange={(e) =>
            dispatch({ type: 'set-exercise-notes', exerciseId: exercise.id, notes: e.target.value })
          }
        />
      </div>
    </div>
  )
}

function SetRow({
  set,
  index,
  exerciseId,
  metric,
  workingIndex,
  isRecord,
  onLogged,
  onWeight,
}: {
  set: LoggedSet
  index: number
  exerciseId: string
  metric: Metric
  workingIndex: number | null
  isRecord: boolean
  onLogged: () => void
  onWeight: (weight: number) => void
}) {
  const { dispatch } = useStore()
  const noun = metric === 'seconds' ? 'Seconds' : 'Reps'

  return (
    <div className={set.kind === 'warmup' ? 'set-row warmup' : 'set-row'}>
      <span className="set-index">{workingIndex ?? 'W'}</span>
      <NumberInput
        className={set.reps > 0 ? 'num-input filled' : 'num-input'}
        ariaLabel={`Weight for set ${index + 1}`}
        value={set.weight}
        placeholder="0"
        onCommit={(weight) => {
          if (set.kind === 'warmup') {
            dispatch({ type: 'update-set', exerciseId, setId: set.id, patch: { weight } })
          } else {
            onWeight(weight)
          }
        }}
      />
      <NumberInput
        className={set.reps > 0 ? 'num-input filled' : 'num-input'}
        ariaLabel={`${noun} for set ${index + 1}`}
        value={set.reps}
        placeholder="0"
        integer
        onCommit={(reps) => {
          dispatch({ type: 'update-set', exerciseId, setId: set.id, patch: { reps } })
          // Starting the rest clock when a working set gets its first rep count
          // is the moment the set is actually over.
          if (reps > 0 && set.reps === 0 && set.kind === 'working') onLogged()
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
        {isRecord ? (
          <span className="badge up" title="New estimated 1RM record" aria-label="New record">
            <IconTrophy />
          </span>
        ) : (
          <button
            type="button"
            className="btn icon ghost"
            aria-label={`Delete set ${index + 1}`}
            onClick={() => dispatch({ type: 'delete-set', exerciseId, setId: set.id })}
          >
            <IconTrash />
          </button>
        )}
      </div>
    </div>
  )
}
