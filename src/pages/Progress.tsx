import { useMemo, useState } from 'react'
import { useStore } from '../state/context'
import {
  bodyweightSeries,
  recordsFor,
  seriesFor,
  sessionVolume,
  volumeByMuscleGroup,
  weeklySummaries,
} from '../lib/stats'
import { planExercise } from '../lib/progression'
import {
  MUSCLE_GROUP_LABELS,
  PROGRESSION_LABELS,
  formatBest,
  formatNumber,
  formatRelativeDate,
  formatShortDate,
  formatVolume,
  formatWeight,
} from '../lib/format'
import { BarChart, LineChart } from '../components/charts'
import { FormCueList } from '../components/FormCueList'
import { MuscleMap } from '../components/MuscleMap'
import { IconChevronRight, IconTrophy } from '../components/Icons'
import type { Route } from '../lib/useRoute'

export function Progress({ navigate }: { navigate: (route: Route) => void }) {
  const { data } = useStore()
  const { settings, sessions, exercises } = data
  const [window_, setWindow] = useState<28 | 84 | 0>(28)

  const finished = useMemo(() => sessions.filter((s) => s.finishedAt), [sessions])
  const weeks = useMemo(() => weeklySummaries(sessions).slice(-10), [sessions])
  const split = useMemo(
    () => volumeByMuscleGroup(sessions, exercises, window_ === 0 ? 3650 : window_),
    [sessions, exercises, window_],
  )
  const maxSets = Math.max(...split.map((s) => s.sets), 1)
  const bodyweight = useMemo(() => bodyweightSeries(sessions), [sessions])

  /** Exercises with history, ranked by how recently they were trained. */
  const tracked = useMemo(
    () =>
      exercises
        .flatMap((exercise) => {
          const records = recordsFor(sessions, exercise.id)
          return records ? [{ exercise, records }] : []
        })
        .sort((a, b) => b.records.lastPerformed.localeCompare(a.records.lastPerformed)),
    [exercises, sessions],
  )

  if (finished.length === 0) {
    return (
      <div className="page">
        <div className="card empty">
          <strong>Nothing to chart yet</strong>
          <p className="muted">
            Log a couple of sessions and this page will fill up with your strength curves, volume and
            personal records.
          </p>
        </div>
      </div>
    )
  }

  const totalVolume = finished.reduce((sum, s) => sum + sessionVolume(s), 0)

  return (
    <div className="page">
      <div className="stat-grid">
        <div className="stat">
          <span className="label">Total volume</span>
          <span className="value">{formatVolume(totalVolume, settings.unit)}</span>
          <span className="sub">across {finished.length} sessions</span>
        </div>
        <div className="stat">
          <span className="label">Lifts tracked</span>
          <span className="value">{tracked.length}</span>
          <span className="sub">with logged history</span>
        </div>
      </div>

      {weeks.length > 1 && (
        <div className="card">
          <div className="card-head">
            <div>
              <h2>Weekly volume</h2>
              <p className="muted-xs">Total weight moved each week, in {settings.unit}.</p>
            </div>
          </div>
          <BarChart
            points={weeks.map((w) => ({
              label: formatShortDate(`${w.weekStart}T12:00:00.000Z`),
              value: Math.round(w.volume),
              detail: `${w.sessions} sessions · ${w.workingSets} sets`,
            }))}
            formatValue={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v)))}
            caption={`Total training volume for each of the last ${weeks.length} weeks`}
          />
        </div>
      )}

      {split.length > 0 && (
        <div className="card">
          <div className="card-head">
            <div>
              <h2>Where the work went</h2>
              <p className="muted-xs">Working sets per muscle group.</p>
            </div>
          </div>
          <div className="chips" style={{ marginBottom: 14 }}>
            {([28, 84, 0] as const).map((option) => (
              <button
                key={option}
                type="button"
                className="chip"
                aria-pressed={window_ === option}
                onClick={() => setWindow(option)}
              >
                {option === 0 ? 'All time' : `Last ${option / 7} weeks`}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {split.map((row) => (
              <div className="hbar" key={row.muscleGroup}>
                <span className="muted">{MUSCLE_GROUP_LABELS[row.muscleGroup]}</span>
                <div className="track">
                  <div className="fill" style={{ width: `${(row.sets / maxSets) * 100}%` }} />
                </div>
                <span className="count">{row.sets} sets</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {bodyweight.length > 1 && (
        <div className="card">
          <div className="card-head">
            <div>
              <h2>Bodyweight</h2>
              <p className="muted-xs">
                From the {bodyweight.length} sessions where you recorded it, in {settings.unit}.
              </p>
            </div>
          </div>
          <LineChart
            points={bodyweight.map((p) => ({
              label: formatShortDate(p.date),
              value: p.weight,
            }))}
            formatValue={(v) => formatNumber(v, 1)}
            caption={`Bodyweight across ${bodyweight.length} sessions, in ${settings.unit}`}
          />
        </div>
      )}

      <div className="card flush">
        <div style={{ padding: '16px 16px 8px' }}>
          <h2>Your lifts</h2>
          <p className="muted-xs">Tap one for its full history and records.</p>
        </div>
        <div className="list">
          {tracked.map(({ exercise, records }) => (
            <button
              key={exercise.id}
              type="button"
              className="list-item"
              onClick={() => navigate({ name: 'exercise', exerciseId: exercise.id })}
            >
              <div className="grow">
                <div className="title">{exercise.name}</div>
                <div className="muted-xs">
                  Best {formatBest(records.bestSetWeight, records.bestSetReps, settings.unit)} ·{' '}
                  {formatRelativeDate(records.lastPerformed)}
                </div>
              </div>
              <IconChevronRight className="chevron" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ExerciseDetail({
  exerciseId,
  navigate,
}: {
  exerciseId: string
  navigate: (route: Route) => void
}) {
  const { data } = useStore()
  const { settings, sessions } = data
  const [metric, setMetric] = useState<'e1rm' | 'topWeight' | 'volume'>('e1rm')

  const exercise = data.exercises.find((e) => e.id === exerciseId)
  const series = useMemo(() => seriesFor(sessions, exerciseId), [sessions, exerciseId])
  const records = useMemo(() => recordsFor(sessions, exerciseId), [sessions, exerciseId])
  const plan = useMemo(
    () => (exercise ? planExercise(exercise, sessions, settings) : null),
    [exercise, sessions, settings],
  )

  if (!exercise) {
    return (
      <div className="page">
        <div className="card empty">
          <strong>Exercise not found</strong>
          <button type="button" className="btn" onClick={() => navigate({ name: 'progress' })}>
            Back to progress
          </button>
        </div>
      </div>
    )
  }

  const metricLabels = {
    e1rm: 'Estimated 1RM',
    topWeight: 'Top set weight',
    volume: 'Volume per session',
  } as const

  const points = series.map((p) => ({
    label: formatShortDate(p.date),
    value:
      metric === 'e1rm' ? p.estimated1RM : metric === 'topWeight' ? p.topWeight : Math.round(p.volume),
    detail: `${p.totalReps} reps · ${formatVolume(p.volume, settings.unit)}`,
  }))

  return (
    <div className="page">
      <div className="card">
        <div className="section-title">{MUSCLE_GROUP_LABELS[exercise.muscleGroup]}</div>
        <h1>{exercise.name}</h1>
        <p className="muted" style={{ marginTop: 4 }}>
          {exercise.sets} sets of {exercise.repMin}–{exercise.repMax} · +
          {formatWeight(exercise.increment, settings.unit)} per step
        </p>
      </div>

      {(exercise.form || exercise.notes) && (
        <div className="card">
          <div className="card-head">
            <h2>How it's done</h2>
          </div>
          <MuscleMap group={exercise.muscleGroup} />
          {exercise.form && (
            <div style={{ marginTop: 14 }}>
              <FormCueList cues={exercise.form} />
            </div>
          )}
          {exercise.notes && (
            <p className="muted" style={{ marginTop: 12 }}>
              {exercise.notes}
            </p>
          )}
        </div>
      )}

      {plan && (
        <div className="card">
          <div className="section-title">Next session</div>
          <div className="prescription" style={{ marginTop: 8 }}>
            <span className="badge hold" style={{ alignSelf: 'flex-start' }}>
              {PROGRESSION_LABELS[plan.kind]}
            </span>
            <div className="target">
              {plan.weight === null
                ? `${plan.sets} sets · ${plan.repMin}–${plan.repMax} reps`
                : `${plan.sets} × ${plan.repTarget} @ ${formatWeight(plan.weight, settings.unit)}`}
            </div>
            <p className="reason">{plan.reason}</p>
          </div>
        </div>
      )}

      {records && (
        <div className="stat-grid">
          {/* Bodyweight lifts have no meaningful 1RM, so reps are the record. */}
          <div className="stat">
            <span className="label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <IconTrophy style={{ width: 13, height: 13 }} />
              {records.best1RM > 0 ? 'Best est. 1RM' : 'Best set'}
            </span>
            <span className="value">
              {records.best1RM > 0
                ? formatWeight(records.best1RM, settings.unit)
                : `${records.bestSetReps} reps`}
            </span>
            <span className="sub">
              {records.best1RM > 0
                ? `from ${formatBest(records.bestSetWeight, records.bestSetReps, settings.unit)}`
                : `${records.sessionCount} sessions logged`}
            </span>
          </div>
          {records.best1RM > 0 && (
            <div className="stat">
              <span className="label">Heaviest set</span>
              <span className="value">{formatWeight(records.heaviestWeight, settings.unit)}</span>
              <span className="sub">{records.sessionCount} sessions logged</span>
            </div>
          )}
        </div>
      )}

      {points.length > 0 && (
        <div className="card">
          <div className="card-head">
            <div>
              <h2>{metricLabels[metric]}</h2>
              <p className="muted-xs">
                {points.length === 1
                  ? 'One session logged — the line appears once there are two.'
                  : `${points.length} sessions, oldest first.`}
              </p>
            </div>
          </div>
          <div className="chips" style={{ marginBottom: 12 }}>
            {(['e1rm', 'topWeight', 'volume'] as const).map((option) => (
              <button
                key={option}
                type="button"
                className="chip"
                aria-pressed={metric === option}
                onClick={() => setMetric(option)}
              >
                {metricLabels[option]}
              </button>
            ))}
          </div>
          <LineChart
            points={points}
            formatValue={(v) =>
              metric === 'volume' && v >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v))
            }
            caption={`${metricLabels[metric]} for ${exercise.name} across ${points.length} sessions, in ${settings.unit}`}
          />
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <h2>Session by session</h2>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <caption className="sr-only">Every logged session for {exercise.name}</caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Top set</th>
                <th scope="col">Reps</th>
                <th scope="col">Est. 1RM</th>
              </tr>
            </thead>
            <tbody>
              {[...series].reverse().map((point) => (
                <tr key={point.date}>
                  <td>{formatShortDate(point.date)}</td>
                  <td>{point.topWeight === 0 ? 'BW' : formatNumber(point.topWeight, 1)}</td>
                  <td>{point.totalReps}</td>
                  <td>{point.estimated1RM ? formatNumber(point.estimated1RM, 1) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
