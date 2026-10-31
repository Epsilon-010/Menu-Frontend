import { useEffect, useRef, useState } from 'react'
import { formatMoney } from '../catalog/price.ts'
import { chartModel, labelledDays, shortDay, type DayValue } from './logic.ts'

/** Categorical slots 1 and 2 of the reference palette, validated on a white surface (CVD ΔE 24.7). */
export const COLLECTED_COLOR = '#2a78d6'
export const PENDING_COLOR = '#eb6834'

/** Width before the container is measured (and on the server). */
const DEFAULT_WIDTH = 640
const HEIGHT = 220
const PLOT = { left: 56, right: 8, top: 12, bottom: 28 }
const PLOT_HEIGHT = HEIGHT - PLOT.top - PLOT.bottom
const RADIUS = 4

/** A bar segment with only its top corners rounded: the data end, never the baseline. */
function topRounded(x: number, y: number, width: number, height: number): string {
  const r = Math.min(RADIUS, width / 2, height)
  return `M${x},${y + height}V${y + r}Q${x},${y} ${x + r},${y}H${x + width - r}Q${x + width},${y} ${x + width},${y + r}V${y + height}Z`
}

function square(x: number, y: number, width: number, height: number): string {
  return `M${x},${y}H${x + width}V${y + height}H${x}Z`
}

function axisMoney(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString('en-US')}`
}

/** Sales per day: collected (on the baseline) and ordered-not-collected stacked above it. */
export function SalesChart({ days }: { days: DayValue[] }) {
  const [hovered, setHovered] = useState<number | null>(null)
  // Drawn at the container's real width, so labels keep their size on a phone instead of shrinking.
  const container = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  useEffect(() => {
    const element = container.current
    if (element === null) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, Math.round(entry.contentRect.width))))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const PLOT_WIDTH = width - PLOT.left - PLOT.right
  const model = chartModel(days, PLOT_WIDTH, PLOT_HEIGHT)
  // Roughly one label per 72px of width, so they never collide.
  const labelled = labelledDays(days.length, Math.max(2, Math.min(8, Math.floor(PLOT_WIDTH / 72))))
  const slot = days.length > 0 ? PLOT_WIDTH / days.length : PLOT_WIDTH
  const active = hovered !== null ? days[hovered] : null
  const tooltipOnLeft = hovered !== null && PLOT.left + (hovered + 0.5) * slot > width * 0.6

  return (
    <figure className="space-y-3">
      <div className="flex flex-wrap gap-4 text-sm text-ink-soft" aria-hidden>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: COLLECTED_COLOR }} />
          Collected
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: PENDING_COLOR }} />
          Ordered, not collected yet
        </span>
      </div>
      <div className="relative" ref={container}>
        <svg
          viewBox={`0 0 ${width} ${HEIGHT}`}
          className="h-auto w-full"
          role="img"
          aria-label="Sales per day: collected and ordered but not collected yet. The daily figures table below has the same numbers."
          onMouseLeave={() => setHovered(null)}
        >
          <g transform={`translate(${PLOT.left},${PLOT.top})`}>
            {model.ticks.map((tick) => {
              const y = PLOT_HEIGHT - (tick / model.max) * PLOT_HEIGHT
              return (
                <g key={tick}>
                  <line x1={0} x2={PLOT_WIDTH} y1={y} y2={y} className={tick === 0 ? 'stroke-line-strong' : 'stroke-line'} strokeWidth={1} />
                  <text x={-8} y={y} dy="0.32em" textAnchor="end" className="fill-muted text-[11px]">
                    {axisMoney(tick)}
                  </text>
                </g>
              )
            })}
            {model.bars.map((bar, index) => {
              const pendingOnTop = bar.pending.height > 0
              const dimmed = hovered !== null && hovered !== index
              return (
                <g key={bar.date} opacity={dimmed ? 0.45 : 1}>
                  {bar.collected.height > 0 && (
                    <path
                      d={(pendingOnTop ? square : topRounded)(bar.x, bar.collected.y, bar.width, bar.collected.height)}
                      fill={COLLECTED_COLOR}
                    />
                  )}
                  {pendingOnTop && (
                    <path d={topRounded(bar.x, bar.pending.y, bar.width, bar.pending.height)} fill={PENDING_COLOR} />
                  )}
                  {labelled.has(index) && (
                    <text x={bar.x + bar.width / 2} y={PLOT_HEIGHT + 18} textAnchor="middle" className="fill-muted text-[11px]">
                      {shortDay(bar.date)}
                    </text>
                  )}
                  {/* The hit target is the whole day column, larger than the bar. */}
                  <rect
                    x={index * slot}
                    y={0}
                    width={slot}
                    height={PLOT_HEIGHT}
                    fill="transparent"
                    onMouseEnter={() => setHovered(index)}
                  />
                </g>
              )
            })}
          </g>
        </svg>
        {active && hovered !== null && (
          <div
            className={`pointer-events-none absolute top-2 z-10 rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-lg ${
              tooltipOnLeft ? '-translate-x-full' : ''
            }`}
            // Beside the bar, never over it: to its right, or to its left past 60% of the width.
            style={{ left: `${PLOT.left + (hovered + 0.5) * slot + (tooltipOnLeft ? -12 : 12)}px` }}
          >
            <p className="font-semibold text-ink">{shortDay(active.date)}</p>
            <p className="mt-1 flex items-center gap-2 text-ink-soft">
              <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: COLLECTED_COLOR }} />
              Collected <span className="ml-auto pl-3 font-medium text-ink tabular-nums">{formatMoney(active.collected_cents)}</span>
            </p>
            <p className="flex items-center gap-2 text-ink-soft">
              <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: PENDING_COLOR }} />
              Not collected <span className="ml-auto pl-3 font-medium text-ink tabular-nums">{formatMoney(active.pending_cents)}</span>
            </p>
          </div>
        )}
      </div>
    </figure>
  )
}
