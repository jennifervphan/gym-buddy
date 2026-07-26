import { useMemo, useState } from 'react'
import type { Routine } from '../types'
import { useStore } from '../state/context'
import { planSession, suggestNextRoutine } from '../lib/progression'
import { buildSession } from '../lib/session'
import {
  sessionsThisWeek,
  stalePrescriptions,
  weeklyStreak,
  weeklySummaries,
} from '../lib/stats'
import {
  PROGRESSION_LABELS,
  formatRelativeDate,
  formatShortDate,
  formatVolume,
  formatWeight,
} from '../lib/format'
import { BarChart } from '../components/charts'
import { Sheet } from '../components/Sheet'
import { IconArrowUp, IconClock, IconFlame, IconPlus } from '../components/Icons'
import type { Route } from '../lib/useRoute'

export function Dashboard({ navigate }: { navigate: (route: Route) => void }) {
  const { data, dispatch } = useStore()
  const { settings, sessions, exercises, routines, activeSession } = data
  const [picking, setPicking] = useState(false)

  const suggested = useMemo(() => suggestNextRoutine(routines, sessions), [routines, sessions])
  const plan = useMemo(
    () => (suggested ? planSession(suggested, exercises, sessions, settings) : null),
    [suggested, exercises, sessions, settings],
  )

  const thisWeek = sessionsThisWeek(sessions)
  const streak = weeklyStreak(sessions, settings.weeklyTarget)
  const weeks = useMemo(() => weeklySummaries(sessions).slice(-8), [sessions])
  const lastSession = useMemo(
    () => sessions.filter((s) => s.finishedAt).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0],
    [sessions],
  )
  const stale = useMemo(() => stalePrescriptions(sessions, exercises).slice(0, 3), [sessions, exercises])
  const upcoming = plan?.exercises.filter((e) => e.kind === 'add-weight').length ?? 0

  const start = (routine: Routine | null) => {
    const planned = routine ? planSession(routine, exercises, sessions, settings) : null
    dispatch({
      type: 'start-session',
      session: buildSession(routine, planned, () => crypto.randomUUID(), new Date().toISOString()),
    })
    setPicking(false)
    navigate({ name: 'workout' })
  }

  return (
    <div className="page">
      {activeSession ? (
        <div className="card">
          <div className="section-title">Session in progress</div>
          <h1 style={{ marginBottom: 4 }}>{activeSession.routineName ?? 'Freestyle session'}</h1>
          <p className="muted" style={{ marginBottom: 12 }}>
            Started {formatRelativeDate(activeSession.startedAt).toLowerCase()} at{' '}
            {new Date(activeSession.startedAt).toLocaleTimeString(undefined, {
              hour: 'numeric',
              minute: '2-digit',
            })}
            .
          </p>
          <button type="button" className="btn primary block" onClick={() => navigate({ name: 'workout' })}>
            Resume session
          </button>
        </div>
      ) : (
        <div className="card">
          <div className="section-title">Up next</div>
          <h1 style={{ marginBottom: 4 }}>{suggested?.name ?? 'Build a routine'}</h1>
          {plan && plan.exercises.length > 0 ? (
            <p className="muted" style={{ marginBottom: 12 }}>
              {plan.exercises.length} exercises
              {upcoming > 0 && ` · ${upcoming} ready for more weight`}
            </p>
          ) : (
            <p className="muted" style={{ marginBottom: 12 }}>
              Add exercises to a routine in your library and the plan will appear here.
            </p>
          )}
          <div className="btn-row">
            <button
              type="button"
              className="btn primary"
              disabled={!suggested}
              onClick={() => start(suggested)}
            >
              Start {suggested?.name ?? 'session'}
            </button>
            <button type="button" className="btn" onClick={() => setPicking(true)}>
              Pick another
            </button>
          </div>
        </div>
      )}

      <div className="stat-grid">
        <div className="stat">
          <span className="label">This week</span>
          <span className="value">
            {thisWeek}
            <span className="muted" style={{ fontSize: '1rem', fontWeight: 500 }}>
              /{settings.weeklyTarget}
            </span>
          </span>
          <span className="sub">
            {thisWeek >= settings.weeklyTarget
              ? 'Target hit'
              : `${settings.weeklyTarget - thisWeek} to go`}
          </span>
        </div>
        <div className="stat">
          <span className="label">Streak</span>
          <span className="value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {streak > 0 && <IconFlame style={{ width: 18, height: 18, color: 'var(--series-2)' }} />}
            {streak}
          </span>
          <span className="sub">{streak === 1 ? 'week on target' : 'weeks on target'}</span>
        </div>
        <div className="stat">
          <span className="label">Last session</span>
          <span className="value" style={{ fontSize: '1.1rem' }}>
            {lastSession ? formatRelativeDate(lastSession.startedAt) : '—'}
          </span>
          <span className="sub">{lastSession?.routineName ?? 'Nothing logged yet'}</span>
        </div>
        <div className="stat">
          <span className="label">Sessions logged</span>
          <span className="value">{sessions.filter((s) => s.finishedAt).length}</span>
          <span className="sub">all time</span>
        </div>
      </div>

      {plan && plan.exercises.length > 0 && !activeSession && (
        <div className="card">
          <div className="card-head">
            <h2>Your plan for {plan.routineName}</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {plan.exercises.map((item) => {
              const exercise = exercises.find((e) => e.id === item.exerciseId)
              if (!exercise) return null
              return (
                <div key={item.exerciseId} style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.94rem' }}>{exercise.name}</div>
                    <div className="muted-xs">{item.reason}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 650, fontVariantNumeric: 'tabular-nums' }}>
                      {item.weight === null
                        ? `${item.repMin}–${item.repMax}`
                        : `${item.sets}×${item.repTarget}`}
                    </div>
                    <div className="muted-xs">
                      {item.weight === null ? 'find a weight' : formatWeight(item.weight, settings.unit)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {weeks.length > 0 && (
        <div className="card">
          <div className="card-head">
            <div>
              <h2>Sessions per week</h2>
              <p className="muted-xs">
                Last {weeks.length} {weeks.length === 1 ? 'week' : 'weeks'}, dashed line is your target of{' '}
                {settings.weeklyTarget}
              </p>
            </div>
          </div>
          <BarChart
            points={weeks.map((w) => ({
              label: formatShortDate(`${w.weekStart}T12:00:00.000Z`),
              value: w.sessions,
              detail: `${formatVolume(w.volume, settings.unit)} · ${w.workingSets} sets`,
            }))}
            formatValue={(v) => String(Math.round(v))}
            caption={`Sessions completed in each of the last ${weeks.length} weeks`}
            target={settings.weeklyTarget}
          />
        </div>
      )}

      {stale.length > 0 && (
        <div className="card">
          <div className="card-head">
            <div>
              <h2>Not trained lately</h2>
              <p className="muted-xs">Nothing logged for these in the last three weeks.</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stale.map(({ exercise, lastPerformed }) => (
              <button
                key={exercise.id}
                type="button"
                className="btn"
                style={{ justifyContent: 'space-between' }}
                onClick={() => navigate({ name: 'exercise', exerciseId: exercise.id })}
              >
                <span>{exercise.name}</span>
                <span className="muted-xs" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <IconClock style={{ width: 13, height: 13 }} />
                  {lastPerformed ? formatRelativeDate(lastPerformed) : 'never'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {picking && (
        <Sheet title="Start a session" onClose={() => setPicking(false)}>
          <div className="card flush">
            <div className="list">
              {routines
                .filter((r) => !r.archived)
                .map((routine) => {
                  const routinePlan = planSession(routine, exercises, sessions, settings)
                  const gains = routinePlan.exercises.filter((e) => e.kind === 'add-weight').length
                  return (
                    <button
                      key={routine.id}
                      type="button"
                      className="list-item"
                      onClick={() => start(routine)}
                    >
                      <div className="grow">
                        <div className="title">{routine.name}</div>
                        <div className="muted-xs">
                          {routinePlan.exercises.length} exercises
                          {gains > 0 && ` · ${gains} going up`}
                        </div>
                      </div>
                      {gains > 0 && (
                        <span className="badge up">
                          <IconArrowUp /> {gains}
                        </span>
                      )}
                    </button>
                  )
                })}
              <button type="button" className="list-item" onClick={() => start(null)}>
                <div className="grow">
                  <div className="title">Freestyle session</div>
                  <div className="muted-xs">Start empty and add exercises as you go</div>
                </div>
                <IconPlus className="chevron" />
              </button>
            </div>
          </div>
        </Sheet>
      )}

      {sessions.length === 0 && !activeSession && (
        <div className="card">
          <div className="section-title">How this works</div>
          <p className="muted" style={{ marginTop: 6 }}>
            Log what you actually lift. Once an exercise has history, Gym Buddy uses double progression to
            tell you what to do next: hold the weight until every set reaches the top of its rep range,
            then add weight and build back up. Stall twice and it cuts the weight for you.
          </p>
          <p className="muted" style={{ marginTop: 8 }}>
            {(['add-reps', 'add-weight', 'deload'] as const)
              .map((k) => PROGRESSION_LABELS[k])
              .join(' · ')}{' '}
            — you'll see which one applies next to every exercise.
          </p>
        </div>
      )}
    </div>
  )
}
