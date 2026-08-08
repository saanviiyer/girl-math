import type { DayStat } from '../lib/types'
import { formatMoney } from '../lib/mathEngine'

interface Props {
  stats: DayStat[]
  currency: string
}

/**
 * Hand-rolled SVG bar chart of daily net (+/-). Bars above the zero line are
 * days you banked money; below the line are over-budget days.
 */
export default function NetBarChart({ stats, currency }: Props) {
  if (stats.length === 0) {
    return <p className="text-sm text-bubble-700/70">No data yet — log a day to see your chart.</p>
  }

  const width = 100
  const height = 48
  const maxAbs = Math.max(1, ...stats.map((s) => Math.abs(s.net)))
  const gap = 0.25
  const barW = (width - gap * (stats.length - 1)) / stats.length
  const mid = height / 2

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full h-28"
        role="img"
        aria-label="Daily net over the last 30 days"
      >
        {/* zero line */}
        <line x1="0" y1={mid} x2={width} y2={mid} stroke="#f9a8c8" strokeWidth="0.4" />
        {stats.map((s, i) => {
          const x = i * (barW + gap)
          const h = (Math.abs(s.net) / maxAbs) * (mid - 2)
          const positive = s.net >= 0
          const y = positive ? mid - h : mid
          return (
            <rect
              key={s.date}
              x={x}
              y={y}
              width={barW}
              height={Math.max(0.4, h)}
              rx="0.6"
              fill={positive ? '#ff3385' : '#c084fc'}
              opacity={0.9}
            >
              <title>{`${s.date}: ${s.net >= 0 ? '+' : ''}${formatMoney(s.net, currency)}`}</title>
            </rect>
          )
        })}
      </svg>
      <div className="mt-1 flex items-center justify-between text-[10px] text-bubble-700/60">
        <span>{stats[0]?.date.slice(5)}</span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-bubble-500" /> banked
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-purple-400" /> over
          </span>
        </span>
        <span>{stats[stats.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  )
}
