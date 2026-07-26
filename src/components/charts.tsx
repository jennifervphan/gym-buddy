import { useCallback, useEffect, useRef, useState } from 'react'
import { barPath, niceTicks, niceTicksInRange } from '../lib/chartScale'

/**
 * Measures the container so the SVG can be drawn at 1:1 with CSS pixels. That
 * keeps axis text at its intended size instead of scaling with a viewBox, and
 * lets tooltip positions map straight onto chart coordinates.
 */
function useWidth(): [(node: HTMLDivElement | null) => void, number] {
  const [width, setWidth] = useState(0)
  const observer = useRef<ResizeObserver | null>(null)

  const ref = useCallback((node: HTMLDivElement | null) => {
    observer.current?.disconnect()
    if (!node) return
    setWidth(node.clientWidth)
    observer.current = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) setWidth(entry.contentRect.width)
    })
    observer.current.observe(node)
  }, [])

  useEffect(() => () => observer.current?.disconnect(), [])
  return [ref, width]
}

export type ChartPoint = {
  /** Axis label, e.g. "4 Mar". */
  label: string
  value: number
  /** Extra line shown in the tooltip. */
  detail?: string
}

type Tooltip = { x: number; y: number; point: ChartPoint } | null

const PAD = { top: 16, right: 12, bottom: 26, left: 40 }

/**
 * Single-series line chart with a crosshair tooltip. No legend by design — with
 * one series the caption above already names what is plotted.
 */
export function LineChart({
  points,
  height = 168,
  formatValue,
  caption,
}: {
  points: ChartPoint[]
  height?: number
  formatValue: (value: number) => string
  caption: string
}) {
  const [ref, width] = useWidth()
  const [tooltip, setTooltip] = useState<Tooltip>(null)

  const plotW = Math.max(0, width - PAD.left - PAD.right)
  const plotH = height - PAD.top - PAD.bottom

  // Pad the domain so a flat or near-flat series still reads as a line.
  const values = points.map((p) => p.value)
  const rawMax = Math.max(...values, 0)
  const rawMin = Math.min(...values, rawMax)
  const span = rawMax - rawMin
  const max = rawMax + (span === 0 ? Math.max(rawMax * 0.1, 1) : span * 0.15)
  const min = Math.max(0, rawMin - (span === 0 ? Math.max(rawMax * 0.1, 1) : span * 0.25))

  const x = (i: number) => (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW)
  const y = (value: number) => plotH - ((value - min) / (max - min || 1)) * plotH

  const ticks = niceTicksInRange(min, max)
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.value)}`).join(' ')
  const area = `${line} L${x(points.length - 1)},${plotH} L${x(0)},${plotH} Z`
  const last = points.at(-1)

  const handleMove = (clientX: number, target: SVGSVGElement) => {
    const rect = target.getBoundingClientRect()
    const localX = clientX - rect.left - PAD.left
    const index =
      points.length === 1
        ? 0
        : Math.max(0, Math.min(points.length - 1, Math.round((localX / plotW) * (points.length - 1))))
    const point = points[index]
    if (point) {
      setTooltip({ x: PAD.left + x(index), y: PAD.top + y(point.value), point })
    }
  }

  return (
    <div className="chart-wrap" ref={ref}>
      {width > 0 && (
        <svg
          className="chart"
          width={width}
          height={height}
          role="img"
          aria-label={caption}
          onMouseMove={(e) => handleMove(e.clientX, e.currentTarget)}
          onMouseLeave={() => setTooltip(null)}
          onTouchStart={(e) => {
            const touch = e.touches[0]
            if (touch) handleMove(touch.clientX, e.currentTarget)
          }}
          onTouchMove={(e) => {
            const touch = e.touches[0]
            if (touch) handleMove(touch.clientX, e.currentTarget)
          }}
          onTouchEnd={() => setTooltip(null)}
        >
          <g transform={`translate(${PAD.left},${PAD.top})`}>
            {ticks.map((tick) => (
              <g key={tick}>
                <line className="grid-line" x1={0} x2={plotW} y1={y(tick)} y2={y(tick)} />
                <text className="tick" x={-8} y={y(tick)} textAnchor="end" dominantBaseline="middle">
                  {formatValue(tick)}
                </text>
              </g>
            ))}

            <path className="series-area" d={area} />
            <path className="series-line" d={line} />

            {tooltip && (
              <line
                className="crosshair"
                x1={tooltip.x - PAD.left}
                x2={tooltip.x - PAD.left}
                y1={0}
                y2={plotH}
              />
            )}

            {/* Only the endpoint carries a marker and a direct label. */}
            {last && <circle className="marker" cx={x(points.length - 1)} cy={y(last.value)} r={4.5} />}
            {last && points.length > 1 && (
              <text
                className="point-label"
                x={x(points.length - 1)}
                y={y(last.value) - 11}
                textAnchor="end"
              >
                {formatValue(last.value)}
              </text>
            )}

            <line className="axis-line" x1={0} x2={plotW} y1={plotH} y2={plotH} />
            <text className="tick" x={0} y={plotH + 16}>
              {points[0]?.label}
            </text>
            {points.length > 1 && (
              <text className="tick" x={plotW} y={plotH + 16} textAnchor="end">
                {last?.label}
              </text>
            )}
          </g>
        </svg>
      )}

      {tooltip && (
        <div className="chart-tooltip" style={{ left: tooltip.x, top: tooltip.y - 10 }}>
          <div className="tt-date">{tooltip.point.label}</div>
          <div className="tt-value">{formatValue(tooltip.point.value)}</div>
          {tooltip.point.detail && <div className="tt-date">{tooltip.point.detail}</div>}
        </div>
      )}
    </div>
  )
}

/**
 * Single-series column chart with per-bar hover. `target` draws a reference line
 * (used for the weekly session goal).
 */
export function BarChart({
  points,
  height = 168,
  formatValue,
  caption,
  target,
}: {
  points: ChartPoint[]
  height?: number
  formatValue: (value: number) => string
  caption: string
  target?: number
}) {
  const [ref, width] = useWidth()
  const [tooltip, setTooltip] = useState<Tooltip>(null)

  const plotW = Math.max(0, width - PAD.left - PAD.right)
  const plotH = height - PAD.top - PAD.bottom
  const max = Math.max(...points.map((p) => p.value), target ?? 0, 1)
  const ticks = niceTicks(max, 3)
  const axisMax = Math.max(...ticks, max)

  const band = points.length > 0 ? plotW / points.length : plotW
  // Cap the mark thickness and leave a 2px surface gap between neighbours.
  const barW = Math.max(3, Math.min(24, band - 2))
  const y = (value: number) => plotH - (value / axisMax) * plotH

  return (
    <div className="chart-wrap" ref={ref}>
      {width > 0 && (
        <svg className="chart" width={width} height={height} role="img" aria-label={caption}>
          <g transform={`translate(${PAD.left},${PAD.top})`}>
            {ticks.map((tick) => (
              <g key={tick}>
                <line className="grid-line" x1={0} x2={plotW} y1={y(tick)} y2={y(tick)} />
                <text className="tick" x={-8} y={y(tick)} textAnchor="end" dominantBaseline="middle">
                  {formatValue(tick)}
                </text>
              </g>
            ))}

            {points.map((point, i) => {
              const barX = i * band + (band - barW) / 2
              const barH = Math.max(point.value > 0 ? 2 : 0, plotH - y(point.value))
              const dim = target !== undefined && point.value < target
              return (
                <g key={`${point.label}-${i}`}>
                  {barH > 0 && (
                    <path className={dim ? 'bar dim' : 'bar'} d={barPath(barX, plotH - barH, barW, barH)} />
                  )}
                  {/* Hit area spans the whole band so small bars stay touchable. */}
                  <rect
                    x={i * band}
                    y={0}
                    width={band}
                    height={plotH}
                    fill="transparent"
                    onMouseEnter={() =>
                      setTooltip({ x: PAD.left + barX + barW / 2, y: PAD.top + plotH - barH, point })
                    }
                    onMouseLeave={() => setTooltip(null)}
                  />
                </g>
              )
            })}

            {target !== undefined && target > 0 && (
              <line className="target-line" x1={0} x2={plotW} y1={y(target)} y2={y(target)} />
            )}

            <line className="axis-line" x1={0} x2={plotW} y1={plotH} y2={plotH} />
            <text className="tick" x={0} y={plotH + 16}>
              {points[0]?.label}
            </text>
            {points.length > 1 && (
              <text className="tick" x={plotW} y={plotH + 16} textAnchor="end">
                {points.at(-1)?.label}
              </text>
            )}
          </g>
        </svg>
      )}

      {tooltip && (
        <div className="chart-tooltip" style={{ left: tooltip.x, top: tooltip.y - 6 }}>
          <div className="tt-date">{tooltip.point.label}</div>
          <div className="tt-value">{formatValue(tooltip.point.value)}</div>
          {tooltip.point.detail && <div className="tt-date">{tooltip.point.detail}</div>}
        </div>
      )}
    </div>
  )
}
