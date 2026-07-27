import { useEffect, useRef, useState } from 'react'
import { parseDecimalInput } from '../lib/format'

/**
 * A numeric field that keeps what the user typed.
 *
 * `<input type="number">` reports an empty value for anything it considers
 * invalid, so a controlled input reading it directly wipes the field the moment
 * you type the decimal point. This keeps the raw text locally and only commits
 * a value once it parses, which also lets a comma work as the decimal
 * separator. The keypad stays numeric via inputMode.
 */
export function NumberInput({
  value,
  onCommit,
  integer = false,
  className,
  ariaLabel,
  placeholder,
  id,
}: {
  value: number
  onCommit: (value: number) => void
  /** Whole numbers only, for rep counts. */
  integer?: boolean
  className?: string
  ariaLabel?: string
  placeholder?: string
  id?: string
}) {
  const format = (n: number) => (n === 0 ? '' : String(n))
  const [text, setText] = useState(() => format(value))
  const focused = useRef(false)

  // Follow changes made elsewhere (a weight copied down the sets, a unit
  // switch), but never overwrite what is being typed right now.
  useEffect(() => {
    if (!focused.current) setText(format(value))
  }, [value])

  return (
    <input
      id={id}
      className={className}
      type="text"
      inputMode={integer ? 'numeric' : 'decimal'}
      autoComplete="off"
      aria-label={ariaLabel}
      placeholder={placeholder}
      value={text}
      onFocus={() => {
        focused.current = true
      }}
      onChange={(e) => {
        const raw = e.target.value
        // Refuse anything that could never become a valid entry, so the field
        // never displays a value it will not store — including a decimal point
        // where only whole numbers make sense.
        const allowed = integer ? /^\d*$/ : /^\d*[.,]?\d*$/
        if (!allowed.test(raw.trim())) return
        const parsed = parseDecimalInput(raw, integer)
        setText(raw)
        if (raw.trim() === '') onCommit(0)
        else if (parsed !== null) onCommit(parsed)
      }}
      onBlur={() => {
        focused.current = false
        setText(format(value))
      }}
    />
  )
}
