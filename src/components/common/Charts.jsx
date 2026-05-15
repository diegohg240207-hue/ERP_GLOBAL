// ── SparkChart ─────────────────────────────────────────────────────────────
export function SparkChart({ values = [], color = 'var(--accent)', height = 60 }) {
  if (!values.length) return null
  const max = Math.max(...values, 1)
  const min = Math.min(...values)
  const range = max - min || 1
  const w = 120
  const h = height
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1 || 1)) * w
    const y = h - ((v - min) / range) * (h - 4) - 2
    return `${x},${y}`
  })
  const polyline = pts.join(' ')
  const area = `0,${h} ${polyline} ${w},${h}`

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#sg)" />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── LineChart ──────────────────────────────────────────────────────────────
export function LineChart({ data = [], color = 'var(--accent)', height = 100, showLabels = true }) {
  if (!data.length) return null
  const values = data.map(d => d.value)
  const max = Math.max(...values, 1)
  const min = 0
  const range = max - min || 1
  const w = 400
  const h = height
  const padL = 0
  const padB = showLabels ? 20 : 4
  const innerH = h - padB - 4
  const innerW = w - padL

  const pts = data.map((d, i) => {
    const x = padL + (i / (data.length - 1 || 1)) * innerW
    const y = 4 + innerH - ((d.value - min) / range) * innerH
    return { x, y, ...d }
  })
  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ')
  const area = `${padL},${4 + innerH} ${polyline} ${padL + innerW},${4 + innerH}`

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#lg)" />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />
      ))}
      {showLabels && pts.filter((_, i) => i % Math.ceil(pts.length / 7) === 0 || i === pts.length - 1).map((p, i) => (
        <text key={i} x={p.x} y={h} textAnchor="middle" fontSize="9" fill="var(--text3)">{p.label}</text>
      ))}
    </svg>
  )
}

// ── BarChart ───────────────────────────────────────────────────────────────
export function BarChart({ data = [], color = 'var(--accent)' }) {
  if (!data.length) return null
  const max = Math.max(...data.map(d => d.value), 1)
  const h = 100
  const w = 300
  const barW = Math.max(4, (w / data.length) - 4)
  const gap = (w - barW * data.length) / (data.length - 1 || 1)

  return (
    <svg width="100%" height={h + 16} viewBox={`0 0 ${w} ${h + 16}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      {data.map((d, i) => {
        const barH = (d.value / max) * h
        const x = i * (barW + gap)
        return (
          <g key={i}>
            <rect x={x} y={h - barH} width={barW} height={barH} rx="3" fill={color} opacity="0.85" />
            <text x={x + barW / 2} y={h + 14} textAnchor="middle" fontSize="9" fill="var(--text3)">{d.label}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ── DonutChart ─────────────────────────────────────────────────────────────
export function DonutChart({ segments = [], size = 120 }) {
  const total = segments.reduce((s, g) => s + g.value, 0)
  if (!total) return null
  const cx = size / 2, cy = size / 2
  const r = size * 0.38
  const stroke = size * 0.14

  let cumAngle = -90
  const arcs = segments.map(seg => {
    const angle = (seg.value / total) * 360
    const start = cumAngle
    cumAngle += angle
    return { ...seg, startAngle: start, endAngle: cumAngle }
  })

  function polar(cx, cy, r, angle) {
    const rad = (angle * Math.PI) / 180
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
  }

  function describeArc(cx, cy, r, startAngle, endAngle) {
    const s = polar(cx, cy, r, startAngle)
    const e = polar(cx, cy, r, endAngle)
    const large = endAngle - startAngle > 180 ? 1 : 0
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      {arcs.map((arc, i) => (
        <path
          key={i}
          d={describeArc(cx, cy, r, arc.startAngle, arc.endAngle - 0.5)}
          fill="none"
          stroke={arc.color}
          strokeWidth={stroke}
          strokeLinecap="butt"
        />
      ))}
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize={size * 0.16} fontWeight="700" fill="var(--text)" fontFamily="Plus Jakarta Sans, sans-serif">{total}</text>
    </svg>
  )
}

// ── GroupedBarChart ────────────────────────────────────────────────────────
export function GroupedBarChart({ data = [], colors = [], height = 140 }) {
  if (!data.length) return null
  const seriesCount = data[0].values?.length || 0
  const max = Math.max(...data.flatMap(d => d.values || []), 1)
  const w = 400
  const h = height
  const padB = 20
  const innerH = h - padB
  const groupW = w / data.length
  const barW = Math.max(4, (groupW - 8) / seriesCount)

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      {data.map((d, gi) => {
        const groupX = gi * groupW + 4
        return (
          <g key={gi}>
            {(d.values || []).map((v, si) => {
              const barH = (v / max) * innerH
              const x = groupX + si * barW
              return (
                <rect key={si} x={x} y={innerH - barH} width={barW - 2} height={barH} rx="2" fill={colors[si] || 'var(--accent)'} opacity="0.85" />
              )
            })}
            <text x={groupX + (groupW - 8) / 2} y={h} textAnchor="middle" fontSize="9" fill="var(--text3)">{d.label}</text>
          </g>
        )
      })}
    </svg>
  )
}
