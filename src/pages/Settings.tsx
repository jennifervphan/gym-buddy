import { useRef, useState } from 'react'
import type { Unit } from '../types'
import { useStore } from '../state/context'
import { exportJSON, importJSON } from '../lib/storage'
import { finishedSessionCount, sessionsSinceBackup } from '../lib/backup'
import { formatRelativeDate } from '../lib/format'

export function Settings() {
  const { data, dispatch } = useStore()
  const { settings } = data
  const fileInput = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const finished = finishedSessionCount(data)
  const unsaved = sessionsSinceBackup(data)

  const download = () => {
    const blob = new Blob([exportJSON(data)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `gym-buddy-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    dispatch({ type: 'record-backup', at: new Date().toISOString() })
    setMessage({ tone: 'ok', text: 'Backup downloaded.' })
  }

  const upload = async (file: File) => {
    const result = importJSON(await file.text())
    if (!result.ok) {
      setMessage({ tone: 'error', text: result.error })
      return
    }
    if (
      !window.confirm(
        `Replace everything on this device with the backup? It has ${result.data.sessions.length} sessions.`,
      )
    ) {
      return
    }
    dispatch({ type: 'replace-data', data: result.data })
    setMessage({ tone: 'ok', text: 'Backup restored.' })
  }

  return (
    <div className="page">
      <div className="card">
        <div className="section-title">Units</div>
        <p className="muted" style={{ margin: '8px 0 10px' }}>
          Switching converts every weight you've already logged, so your history keeps meaning the same
          thing.
        </p>
        <div className="segmented">
          {(['kg', 'lb'] as Unit[]).map((unit) => (
            <button
              key={unit}
              type="button"
              aria-pressed={settings.unit === unit}
              onClick={() => {
                if (settings.unit === unit) return
                dispatch({ type: 'update-settings', patch: { unit } })
              }}
            >
              {unit === 'kg' ? 'Kilograms' : 'Pounds'}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="section-title">Training</div>
        <div className="switch-row">
          <div>
            <div style={{ fontWeight: 600 }}>Sessions per week</div>
            <div className="muted-xs">Drives your streak and the weekly target line.</div>
          </div>
          <input
            className="num-input"
            style={{ width: 72 }}
            type="number"
            inputMode="numeric"
            min="1"
            max="14"
            aria-label="Weekly session target"
            value={settings.weeklyTarget}
            onChange={(e) =>
              dispatch({
                type: 'update-settings',
                patch: { weeklyTarget: Math.max(1, Math.min(14, Number(e.target.value) || 1)) },
              })
            }
          />
        </div>

        <div className="switch-row">
          <div>
            <div style={{ fontWeight: 600 }}>Stall limit</div>
            <div className="muted-xs">
              Sessions short of the rep range at one weight before the plan deloads.
            </div>
          </div>
          <input
            className="num-input"
            style={{ width: 72 }}
            type="number"
            inputMode="numeric"
            min="1"
            max="5"
            aria-label="Stall limit"
            value={settings.stallLimit}
            onChange={(e) =>
              dispatch({
                type: 'update-settings',
                patch: { stallLimit: Math.max(1, Math.min(5, Number(e.target.value) || 1)) },
              })
            }
          />
        </div>

        <div className="switch-row">
          <div>
            <div style={{ fontWeight: 600 }}>Deload size</div>
            <div className="muted-xs">How much weight comes off when a lift stalls.</div>
          </div>
          <select
            className="select"
            style={{ width: 96 }}
            aria-label="Deload size"
            value={settings.deloadFraction}
            onChange={(e) =>
              dispatch({ type: 'update-settings', patch: { deloadFraction: Number(e.target.value) } })
            }
          >
            {[0.05, 0.1, 0.15, 0.2].map((option) => (
              <option key={option} value={option}>
                {Math.round(option * 100)}%
              </option>
            ))}
          </select>
        </div>

        <div className="switch-row">
          <div>
            <div style={{ fontWeight: 600 }}>Rest timer</div>
            <div className="muted-xs">Starts automatically when you log a working set.</div>
          </div>
          <button
            type="button"
            className="btn sm"
            aria-pressed={settings.restTimerEnabled}
            onClick={() =>
              dispatch({
                type: 'update-settings',
                patch: { restTimerEnabled: !settings.restTimerEnabled },
              })
            }
          >
            {settings.restTimerEnabled ? 'On' : 'Off'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="section-title">Your data</div>
        <p className="muted" style={{ margin: '8px 0 10px' }}>
          Everything lives in this browser's storage only — nothing is uploaded anywhere. Clearing
          your browsing data deletes it, and a browser can evict the storage of a site you haven't
          opened in a while. Installing the app to your home screen protects against that; an
          exported backup protects against everything.
        </p>
        <p className="muted-xs" style={{ marginBottom: 12 }}>
          {data.lastBackup
            ? `Last backup ${formatRelativeDate(data.lastBackup.at).toLowerCase()}` +
              (unsaved > 0
                ? ` · ${unsaved} ${unsaved === 1 ? 'session' : 'sessions'} logged since`
                : ' · nothing new since')
            : finished === 0
              ? 'Nothing logged yet.'
              : `Never backed up · ${finished} ${finished === 1 ? 'session' : 'sessions'} at risk`}
        </p>
        <div className="btn-row">
          <button type="button" className="btn" onClick={download}>
            Export backup
          </button>
          <button type="button" className="btn" onClick={() => fileInput.current?.click()}>
            Restore backup
          </button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void upload(file)
            e.target.value = ''
          }}
        />
        {message && (
          <p
            className="muted-xs"
            style={{ marginTop: 10, color: message.tone === 'error' ? 'var(--critical)' : undefined }}
            role="status"
          >
            {message.text}
          </p>
        )}
      </div>

      <div className="card">
        <div className="section-title">Start over</div>
        <p className="muted" style={{ margin: '8px 0 12px' }}>
          Deletes every session and restores the built-in exercise library and routines.
        </p>
        <button
          type="button"
          className="btn danger block"
          onClick={() => {
            if (window.confirm('Delete all sessions and reset the library? This cannot be undone.')) {
              dispatch({ type: 'reset-data', unit: settings.unit })
              setMessage({ tone: 'ok', text: 'Everything reset.' })
            }
          }}
        >
          Reset all data
        </button>
      </div>

      <p className="muted-xs" style={{ textAlign: 'center' }}>
        Gym Buddy · {data.exercises.length} exercises · {data.sessions.filter((s) => s.finishedAt).length}{' '}
        sessions logged
      </p>
    </div>
  )
}
