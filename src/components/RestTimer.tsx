import { useEffect, useState } from 'react'
import { formatClock } from '../lib/format'

/**
 * Counts down the rest between sets. Uses a wall-clock end time rather than
 * accumulating ticks, so the countdown stays honest if the tab is backgrounded.
 */
export function RestTimer({
  endsAt,
  totalSeconds,
  onDismiss,
  onExtend,
}: {
  endsAt: number
  totalSeconds: number
  onDismiss: () => void
  onExtend: (seconds: number) => void
}) {
  const [remaining, setRemaining] = useState(() => (endsAt - Date.now()) / 1000)

  useEffect(() => {
    setRemaining((endsAt - Date.now()) / 1000)
    const id = setInterval(() => setRemaining((endsAt - Date.now()) / 1000), 500)
    return () => clearInterval(id)
  }, [endsAt])

  const done = remaining <= 0
  const progress = Math.max(0, Math.min(1, remaining / Math.max(totalSeconds, 1)))

  return (
    <div className="rest-timer" role="status" aria-live="polite">
      <span className="clock">{done ? 'Go' : formatClock(remaining)}</span>
      <div className="track">
        <div className="fill" style={{ width: `${progress * 100}%` }} />
      </div>
      <button type="button" onClick={() => onExtend(30)}>
        +30s
      </button>
      <button type="button" onClick={onDismiss}>
        {done ? 'Done' : 'Skip'}
      </button>
    </div>
  )
}
