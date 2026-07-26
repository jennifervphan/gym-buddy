/** Clean axis values (1 / 2 / 2.5 / 5 × a power of ten) covering 0…max. */
export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 1]
  const rough = max / count
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? magnitude * 10
  // Round the top up onto the step grid so the axis always contains `max`.
  const steps = Math.ceil(max / step - 1e-9)
  return Array.from({ length: steps + 1 }, (_, i) => Math.round(i * step * 1000) / 1000)
}

/**
 * Clean tick values lying inside an arbitrary domain. Charts whose baseline
 * isn't zero — a strength curve, say — need ticks stepped across the visible
 * range, not counted up from zero.
 */
export function niceTicksInRange(min: number, max: number, count = 4): number[] {
  if (!(max > min)) return [min]
  const rough = (max - min) / count
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? magnitude * 10
  // The chosen step is never more than half the domain, so this always yields
  // at least two ticks.
  const first = Math.ceil(min / step - 1e-9) * step
  const ticks: number[] = []
  for (let i = 0; ; i++) {
    const value = first + i * step
    if (value > max + 1e-9) break
    ticks.push(Math.round(value * 1000) / 1000)
  }
  return ticks
}

/** Bar geometry: rounded at the data end, square at the baseline. */
export function barPath(x: number, y: number, w: number, h: number): string {
  const r = Math.min(4, w / 2, h)
  const bottom = y + h
  return `M${x},${bottom} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${bottom} Z`
}
