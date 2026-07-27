import { useMemo } from 'react'
import { useStore } from '../state/context'
import { sessionVolume, sessionWorkingSets } from '../lib/stats'
import type { Exercise } from '../types'
import {
  formatDate,
  formatDuration,
  formatNumber,
  formatTime,
  formatVolume,
  formatWeight,
} from '../lib/format'
import { IconChevronRight, IconTrash } from '../components/Icons'
import type { Route } from '../lib/useRoute'

export function History({ navigate }: { navigate: (route: Route) => void }) {
  const { data } = useStore()
  const { settings } = data

  const sessions = useMemo(
    () => data.sessions.filter((s) => s.finishedAt).sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    [data.sessions],
  )

  if (sessions.length === 0) {
    return (
      <div className="page">
        <div className="card empty">
          <strong>No sessions yet</strong>
          <p className="muted">Finish a workout and it will show up here with everything you lifted.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="card flush">
        <div className="list">
          {sessions.map((session) => (
            <button
              key={session.id}
              type="button"
              className="list-item"
              onClick={() => navigate({ name: 'session', sessionId: session.id })}
            >
              <div className="grow">
                <div className="title">{session.routineName ?? 'Freestyle session'}</div>
                <div className="muted-xs">
                  {formatDate(session.startedAt)} · {sessionWorkingSets(session)} sets ·{' '}
                  {formatVolume(sessionVolume(session), settings.unit)}
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

/**
 * A zero only means bodyweight on an exercise you actually do at bodyweight;
 * on a loaded lift it means no weight was recorded, and saying "BW" there
 * misrepresents what happened.
 */
function formatLoggedWeight(weight: number, exercise: Exercise | undefined): string {
  if (weight > 0) return formatNumber(weight)
  return exercise?.equipment === 'bodyweight' ? 'BW' : '—'
}

export function SessionDetail({
  sessionId,
  navigate,
}: {
  sessionId: string
  navigate: (route: Route) => void
}) {
  const { data, dispatch } = useStore()
  const { settings } = data
  const session = data.sessions.find((s) => s.id === sessionId)
  const byId = useMemo(() => new Map(data.exercises.map((e) => [e.id, e])), [data.exercises])

  if (!session) {
    return (
      <div className="page">
        <div className="card empty">
          <strong>Session not found</strong>
          <button type="button" className="btn" onClick={() => navigate({ name: 'history' })}>
            Back to history
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="card">
        <div className="section-title">{formatDate(session.startedAt)}</div>
        <h1>{session.routineName ?? 'Freestyle session'}</h1>
        <p className="muted" style={{ marginTop: 4 }}>
          {formatTime(session.startedAt)} · {formatDuration(session.startedAt, session.finishedAt)}
          {session.bodyweight !== undefined && ` · ${formatWeight(session.bodyweight, settings.unit)} bw`}
        </p>
      </div>

      <div className="stat-grid">
        <div className="stat">
          <span className="label">Volume</span>
          <span className="value">{formatVolume(sessionVolume(session), settings.unit)}</span>
          <span className="sub">weight × reps</span>
        </div>
        <div className="stat">
          <span className="label">Working sets</span>
          <span className="value">{sessionWorkingSets(session)}</span>
          <span className="sub">across {session.exercises.length} exercises</span>
        </div>
      </div>

      {session.exercises.map((entry) => {
        const exercise = byId.get(entry.exerciseId)
        const working = entry.sets.filter((s) => s.kind === 'working')
        const warmups = entry.sets.filter((s) => s.kind === 'warmup')
        return (
          <div className="card" key={entry.exerciseId}>
            <div className="card-head">
              <div>
                <h2>{exercise?.name ?? 'Removed exercise'}</h2>
                {entry.planned && <p className="muted-xs">Planned: {entry.planned.reason}</p>}
              </div>
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <caption className="sr-only">
                  Sets logged for {exercise?.name ?? 'this exercise'}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Set</th>
                    <th scope="col">Weight ({settings.unit})</th>
                    <th scope="col">Reps</th>
                  </tr>
                </thead>
                <tbody>
                  {working.map((set, i) => (
                    <tr key={set.id}>
                      <td>{i + 1}</td>
                      <td>{formatLoggedWeight(set.weight, exercise)}</td>
                      <td>{set.reps}</td>
                    </tr>
                  ))}
                  {warmups.map((set) => (
                    <tr key={set.id}>
                      <td>Warmup</td>
                      <td>{formatLoggedWeight(set.weight, exercise)}</td>
                      <td>{set.reps}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {entry.notes && (
              <p className="muted" style={{ marginTop: 10 }}>
                {entry.notes}
              </p>
            )}
          </div>
        )
      })}

      {session.notes && (
        <div className="card">
          <div className="section-title">Session notes</div>
          <p className="muted" style={{ marginTop: 6 }}>
            {session.notes}
          </p>
        </div>
      )}

      <button
        type="button"
        className="btn danger block"
        onClick={() => {
          if (window.confirm('Delete this session? Your progression plan will recalculate without it.')) {
            dispatch({ type: 'delete-session', sessionId })
            navigate({ name: 'history' })
          }
        }}
      >
        <IconTrash /> Delete session
      </button>
    </div>
  )
}
