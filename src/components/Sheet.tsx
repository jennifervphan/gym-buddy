import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { IconX } from './Icons'

/**
 * Bottom sheet used for every modal flow. Closes on backdrop click and Escape,
 * and locks background scroll while open.
 */
export function Sheet({
  title,
  onClose,
  children,
  footer,
  action,
  subhead,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  /** Sits in the sticky header, so it stays reachable down a long list. */
  action?: ReactNode
  /** Also sticky, below the title — a search field, typically. */
  subhead?: ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  return (
    <div
      className="sheet-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        {/* Handle and title share one sticky block so the list scrolls behind a
            single opaque bar, with no gap at the edges for it to show through. */}
        <div className="sheet-top">
          <div className="sheet-handle" />
          <div className="sheet-head">
            <h2>{title}</h2>
            <div className="sheet-actions">
              {action}
              <button type="button" className="btn icon ghost" onClick={onClose} aria-label="Close">
                <IconX />
              </button>
            </div>
          </div>
          {subhead}
        </div>
        {children}
        {footer}
      </div>
    </div>
  )
}
