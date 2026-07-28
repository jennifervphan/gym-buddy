import { useMemo, useState } from 'react'
import type { Equipment, Exercise, MuscleGroup, Routine } from '../types'
import { useStore } from '../state/context'
import {
  EQUIPMENT,
  EQUIPMENT_LABELS,
  MUSCLE_GROUPS,
  MUSCLE_GROUP_LABELS,
  formatWeight,
} from '../lib/format'
import { PROGRAMS, buildProgramRoutines } from '../lib/programs'
import type { Program } from '../lib/programs'
import { Sheet } from '../components/Sheet'
import { IconChevronRight, IconPlus, IconTrash } from '../components/Icons'
import type { Route } from '../lib/useRoute'

type Tab = 'routines' | 'exercises'

export function Library({ navigate }: { navigate: (route: Route) => void }) {
  const { data, dispatch } = useStore()
  const [tab, setTab] = useState<Tab>('routines')
  const [editing, setEditing] = useState<Exercise | null>(null)
  const [group, setGroup] = useState<MuscleGroup | 'all'>('all')
  const [showArchived, setShowArchived] = useState(false)
  const [browsing, setBrowsing] = useState(false)

  const exercises = useMemo(
    () =>
      data.exercises
        .filter((e) => showArchived || !e.archived)
        .filter((e) => group === 'all' || e.muscleGroup === group)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [data.exercises, group, showArchived],
  )

  const newRoutine = () => {
    const routine: Routine = {
      id: crypto.randomUUID(),
      name: `Routine ${data.routines.length + 1}`,
      exerciseIds: [],
      custom: true,
      archived: false,
    }
    dispatch({ type: 'save-routine', routine })
    navigate({ name: 'routine', routineId: routine.id })
  }

  const blankExercise = (): Exercise => ({
    id: crypto.randomUUID(),
    name: '',
    muscleGroup: 'chest',
    equipment: 'barbell',
    sets: 3,
    repMin: 8,
    repMax: 12,
    increment: data.settings.unit === 'kg' ? 2.5 : 5,
    restSeconds: 120,
    custom: true,
    archived: false,
  })

  return (
    <div className="page">
      <div className="segmented">
        <button type="button" aria-pressed={tab === 'routines'} onClick={() => setTab('routines')}>
          Routines
        </button>
        <button type="button" aria-pressed={tab === 'exercises'} onClick={() => setTab('exercises')}>
          Exercises
        </button>
      </div>

      {tab === 'routines' ? (
        <>
          <div className="card flush">
            <div className="list">
              {data.routines.map((routine) => (
                <button
                  key={routine.id}
                  type="button"
                  className="list-item"
                  onClick={() => navigate({ name: 'routine', routineId: routine.id })}
                >
                  <div className="grow">
                    <div className="title">{routine.name}</div>
                    <div className="muted-xs">
                      {routine.exerciseIds.length} exercises
                      {routine.archived && ' · archived'}
                    </div>
                  </div>
                  <IconChevronRight className="chevron" />
                </button>
              ))}
              {data.routines.length === 0 && (
                <div className="empty">
                  <strong>No routines yet</strong>
                  <p className="muted">Create one to get a session plan on the home screen.</p>
                </div>
              )}
            </div>
          </div>
          <div className="btn-row">
            <button type="button" className="btn" onClick={newRoutine}>
              <IconPlus /> New routine
            </button>
            <button type="button" className="btn" onClick={() => setBrowsing(true)}>
              Browse programs
            </button>
          </div>
          <p className="muted-xs">
            Sessions rotate through your routines in order — finish one and the home screen suggests the
            next.
          </p>
        </>
      ) : (
        <>
          <div className="chips">
            <button
              type="button"
              className="chip"
              aria-pressed={group === 'all'}
              onClick={() => setGroup('all')}
            >
              All
            </button>
            {MUSCLE_GROUPS.map((option) => (
              <button
                key={option}
                type="button"
                className="chip"
                aria-pressed={group === option}
                onClick={() => setGroup(option)}
              >
                {MUSCLE_GROUP_LABELS[option]}
              </button>
            ))}
          </div>

          <div className="card flush">
            <div className="list">
              {exercises.map((exercise) => (
                <button
                  key={exercise.id}
                  type="button"
                  className="list-item"
                  onClick={() => setEditing(exercise)}
                >
                  <div className="grow">
                    <div className="title">
                      {exercise.name}
                      {exercise.archived && ' (archived)'}
                    </div>
                    <div className="muted-xs">
                      {EQUIPMENT_LABELS[exercise.equipment]} · {exercise.sets}×{exercise.repMin}–
                      {exercise.repMax} · +{formatWeight(exercise.increment, data.settings.unit)}
                    </div>
                  </div>
                  <IconChevronRight className="chevron" />
                </button>
              ))}
              {exercises.length === 0 && (
                <div className="empty">
                  <p className="muted">Nothing matches that filter.</p>
                </div>
              )}
            </div>
          </div>

          <div className="btn-row">
            <button type="button" className="btn" onClick={() => setEditing(blankExercise())}>
              <IconPlus /> New exercise
            </button>
            <button
              type="button"
              className="btn ghost"
              aria-pressed={showArchived}
              onClick={() => setShowArchived((v) => !v)}
            >
              {showArchived ? 'Hide' : 'Show'} archived
            </button>
          </div>
        </>
      )}

      {editing && <ExerciseEditor exercise={editing} onClose={() => setEditing(null)} />}
      {browsing && <ProgramPicker onClose={() => setBrowsing(false)} />}
    </div>
  )
}

function ProgramPicker({ onClose }: { onClose: () => void }) {
  const { data, dispatch } = useStore()

  const apply = (program: Program) => {
    const { routines, unarchive } = buildProgramRoutines(program, data.exercises, () =>
      crypto.randomUUID(),
    )
    const confirmed = window.confirm(
      `Replace your ${data.routines.length} routines with the ${program.days.length} days of "${program.name}"?\n\n` +
        'Your logged sessions and exercise library are kept, so nothing you have tracked is lost.',
    )
    if (!confirmed) return
    dispatch({ type: 'apply-program', routines, unarchive })
    onClose()
  }

  return (
    <Sheet title="Choose a program" onClose={onClose}>
      <p className="muted">
        Each one replaces your routines with a ready-made split. Your logged sessions and exercise
        library stay exactly as they are.
      </p>
      {PROGRAMS.map((program) => (
        <div className="card" key={program.id}>
          <div className="card-head" style={{ marginBottom: 8 }}>
            <div>
              <h2>{program.name}</h2>
              <p className="muted-xs">{program.daysPerWeek} days a week</p>
            </div>
          </div>
          <p className="muted" style={{ marginBottom: 10 }}>
            {program.summary}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
            {program.days.map((day) => (
              <div key={day.name}>
                <div style={{ fontWeight: 600, fontSize: '0.86rem' }}>{day.name}</div>
                <div className="muted-xs">{day.exercises.join(' · ')}</div>
              </div>
            ))}
          </div>
          <button type="button" className="btn primary block" onClick={() => apply(program)}>
            Use this program
          </button>
        </div>
      ))}
    </Sheet>
  )
}

function ExerciseEditor({ exercise, onClose }: { exercise: Exercise; onClose: () => void }) {
  const { data, dispatch } = useStore()
  const [draft, setDraft] = useState<Exercise>(exercise)
  const isNew = !data.exercises.some((e) => e.id === exercise.id)

  const patch = (values: Partial<Exercise>) => setDraft((current) => ({ ...current, ...values }))
  const nameError = draft.name.trim() === ''
  const rangeError = draft.repMin >= draft.repMax

  const save = () => {
    if (nameError || rangeError) return
    dispatch({ type: 'save-exercise', exercise: { ...draft, name: draft.name.trim() } })
    onClose()
  }

  return (
    <Sheet title={isNew ? 'New exercise' : draft.name || 'Edit exercise'} onClose={onClose}>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="field">
          <label htmlFor="ex-name">Name</label>
          <input
            id="ex-name"
            className="input"
            value={draft.name}
            placeholder="e.g. Zercher Squat"
            onChange={(e) => patch({ name: e.target.value })}
          />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="ex-group">Muscle group</label>
            <select
              id="ex-group"
              className="select"
              value={draft.muscleGroup}
              onChange={(e) => patch({ muscleGroup: e.target.value as MuscleGroup })}
            >
              {MUSCLE_GROUPS.map((option) => (
                <option key={option} value={option}>
                  {MUSCLE_GROUP_LABELS[option]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="ex-equipment">Equipment</label>
            <select
              id="ex-equipment"
              className="select"
              value={draft.equipment}
              onChange={(e) => patch({ equipment: e.target.value as Equipment })}
            >
              {EQUIPMENT.map((option) => (
                <option key={option} value={option}>
                  {EQUIPMENT_LABELS[option]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="section-title">Progression</div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="ex-sets">Working sets</label>
            <input
              id="ex-sets"
              className="input"
              type="number"
              inputMode="numeric"
              min="1"
              max="10"
              value={draft.sets}
              onChange={(e) => patch({ sets: Math.max(1, Number(e.target.value) || 1) })}
            />
          </div>
          <div className="field">
            <label htmlFor="ex-increment">Weight step ({data.settings.unit})</label>
            <input
              id="ex-increment"
              className="input"
              type="number"
              inputMode="decimal"
              step="0.5"
              min="0.5"
              value={draft.increment}
              onChange={(e) => patch({ increment: Math.max(0.5, Number(e.target.value) || 0.5) })}
            />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="ex-repmin">Rep range low</label>
            <input
              id="ex-repmin"
              className="input"
              type="number"
              inputMode="numeric"
              min="1"
              value={draft.repMin}
              onChange={(e) => patch({ repMin: Math.max(1, Number(e.target.value) || 1) })}
            />
          </div>
          <div className="field">
            <label htmlFor="ex-repmax">Rep range high</label>
            <input
              id="ex-repmax"
              className="input"
              type="number"
              inputMode="numeric"
              min="2"
              value={draft.repMax}
              onChange={(e) => patch({ repMax: Math.max(2, Number(e.target.value) || 2) })}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="ex-rest">Rest between sets (seconds)</label>
          <input
            id="ex-rest"
            className="input"
            type="number"
            inputMode="numeric"
            step="15"
            min="0"
            value={draft.restSeconds}
            onChange={(e) => patch({ restSeconds: Math.max(0, Number(e.target.value) || 0) })}
          />
        </div>

        <div className="field">
          <label htmlFor="ex-notes">Notes</label>
          <input
            id="ex-notes"
            className="input"
            placeholder="Setup, seat height, which machine…"
            value={draft.notes ?? ''}
            onChange={(e) => patch({ notes: e.target.value || undefined })}
          />
        </div>

        <p className="muted-xs">
          Gym Buddy holds the weight until every set reaches {draft.repMax} reps, then adds{' '}
          {formatWeight(draft.increment, data.settings.unit)} and rebuilds from {draft.repMin}.
        </p>

        {rangeError && (
          <p className="muted-xs" style={{ color: 'var(--critical)' }}>
            The high end of the rep range needs to be above the low end.
          </p>
        )}
      </div>

      <button
        type="button"
        className="btn primary block"
        onClick={save}
        disabled={nameError || rangeError}
      >
        {isNew ? 'Add to library' : 'Save changes'}
      </button>

      {!isNew && (
        <button
          type="button"
          className="btn ghost block"
          onClick={() => {
            dispatch({
              type: 'archive-exercise',
              exerciseId: draft.id,
              archived: !draft.archived,
            })
            onClose()
          }}
        >
          {draft.archived ? 'Restore to library' : 'Archive exercise'}
        </button>
      )}
    </Sheet>
  )
}

export function RoutineDetail({
  routineId,
  navigate,
}: {
  routineId: string
  navigate: (route: Route) => void
}) {
  const { data, dispatch } = useStore()
  const routine = data.routines.find((r) => r.id === routineId)
  const [adding, setAdding] = useState(false)
  // Kept in tap order, so the routine ends up in the order they were chosen.
  const [selected, setSelected] = useState<string[]>([])

  const byId = useMemo(() => new Map(data.exercises.map((e) => [e.id, e])), [data.exercises])

  if (!routine) {
    return (
      <div className="page">
        <div className="card empty">
          <strong>Routine not found</strong>
          <button type="button" className="btn" onClick={() => navigate({ name: 'library' })}>
            Back to library
          </button>
        </div>
      </div>
    )
  }

  const save = (patch: Partial<Routine>) =>
    dispatch({ type: 'save-routine', routine: { ...routine, ...patch } })

  const move = (index: number, delta: number) => {
    const next = [...routine.exerciseIds]
    const target = index + delta
    const [moved] = next.splice(index, 1)
    if (moved === undefined || target < 0 || target > next.length) return
    next.splice(target, 0, moved)
    save({ exerciseIds: next })
  }

  const available = data.exercises
    .filter((e) => !e.archived && !routine.exerciseIds.includes(e.id))
    .sort((a, b) => a.name.localeCompare(b.name))

  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((other) => other !== id) : [...current, id],
    )

  const closeAdding = () => {
    setAdding(false)
    setSelected([])
  }

  const addSelected = () => {
    if (selected.length === 0) return
    save({ exerciseIds: [...routine.exerciseIds, ...selected] })
    closeAdding()
  }

  return (
    <div className="page">
      <div className="card">
        <div className="field">
          <label htmlFor="routine-name">Routine name</label>
          <input
            id="routine-name"
            className="input"
            value={routine.name}
            onChange={(e) => save({ name: e.target.value })}
          />
        </div>
      </div>

      <div className="card flush">
        <div className="list">
          {routine.exerciseIds.map((id, index) => {
            const exercise = byId.get(id)
            return (
              <div className="list-item" key={id}>
                <span className="set-index">{index + 1}</span>
                <div className="grow">
                  <div className="title">{exercise?.name ?? 'Removed exercise'}</div>
                  {exercise && (
                    <div className="muted-xs">
                      {exercise.sets}×{exercise.repMin}–{exercise.repMax}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="btn icon ghost"
                  aria-label="Move up"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn icon ghost"
                  aria-label="Move down"
                  disabled={index === routine.exerciseIds.length - 1}
                  onClick={() => move(index, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="btn icon ghost"
                  aria-label={`Remove ${exercise?.name ?? 'exercise'} from routine`}
                  onClick={() =>
                    save({ exerciseIds: routine.exerciseIds.filter((other) => other !== id) })
                  }
                >
                  <IconTrash />
                </button>
              </div>
            )
          })}
          {routine.exerciseIds.length === 0 && (
            <div className="empty">
              <p className="muted">No exercises yet. Add a few and they'll be planned in this order.</p>
            </div>
          )}
        </div>
      </div>

      <button type="button" className="btn block" onClick={() => setAdding(true)}>
        <IconPlus /> Add exercise
      </button>

      <button
        type="button"
        className="btn danger block"
        onClick={() => {
          if (window.confirm(`Delete "${routine.name}"? Logged sessions are kept.`)) {
            dispatch({ type: 'delete-routine', routineId })
            navigate({ name: 'library' })
          }
        }}
      >
        <IconTrash /> Delete routine
      </button>

      {adding && (
        <Sheet
          title="Add to routine"
          onClose={closeAdding}
          action={
            selected.length > 0 ? (
              <button type="button" className="btn primary sm" onClick={addSelected}>
                Add {selected.length}
              </button>
            ) : null
          }
        >
          <p className="muted-xs">
            {selected.length === 0
              ? 'Tap as many as you like, then add them all at once.'
              : `They will be added in the order you tapped them.`}
          </p>
          <div className="card flush">
            <div className="list">
              {available.map((exercise) => {
                const order = selected.indexOf(exercise.id)
                return (
                  <button
                    key={exercise.id}
                    type="button"
                    className="list-item"
                    aria-pressed={order !== -1}
                    onClick={() => toggle(exercise.id)}
                  >
                    <div className="grow">
                      <div className="title">{exercise.name}</div>
                      <div className="muted-xs">{MUSCLE_GROUP_LABELS[exercise.muscleGroup]}</div>
                    </div>
                    <span className="check-dot">{order === -1 ? '' : order + 1}</span>
                  </button>
                )
              })}
              {available.length === 0 && (
                <div className="empty">
                  <p className="muted">Every exercise is already in this routine.</p>
                </div>
              )}
            </div>
          </div>
          {selected.length > 0 && (
            <button type="button" className="btn primary block" onClick={addSelected}>
              Add {selected.length} {selected.length === 1 ? 'exercise' : 'exercises'}
            </button>
          )}
        </Sheet>
      )}
    </div>
  )
}
