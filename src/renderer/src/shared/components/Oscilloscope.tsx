import type { ReactNode } from 'react'

export interface ScopePoint {
  x: number
  y: number
}

export interface ScopeSeries {
  id: string | number
  color: string
  /** `null` corta la línea (p. ej. cuando el barrido da la vuelta) */
  points: Array<ScopePoint | null>
  /** líneas continuas o puntos aislados (gráficas de dispersión) */
  mode?: 'line' | 'dots'
}

export interface OscilloscopeProps {
  xMax: number
  yMax: number
  xMin?: number
  yMin?: number
  xTicks: number[]
  yTicks: number[]
  xLabel: string
  yLabel: string
  series: ScopeSeries[]
  /** flecha en el eje Y (fuerza pasiva) */
  markerY?: number
  markerTitle?: string
  /** línea vertical de medición */
  measureX?: number | null
  legend?: Array<{ label: string; color: string }>
  /** fondo claro para impresión */
  light?: boolean
  /** tamaño del viewBox; más angosto = texto más grande al escalar */
  width?: number
  height?: number
  className?: string
}

const M = { top: 16, right: 16, bottom: 44, left: 52 }

/** Gráfico `.px-chart` genérico en SVG (sigue el tema; escala sin perder nitidez) */
export function Oscilloscope({
  xMax,
  yMax,
  xMin = 0,
  yMin = 0,
  xTicks,
  yTicks,
  xLabel,
  yLabel,
  series,
  markerY,
  markerTitle,
  measureX,
  legend,
  light = false,
  width: W = 660,
  height: H = 300,
  className = ''
}: OscilloscopeProps): ReactNode {
  const PW = W - M.left - M.right
  const PH = H - M.top - M.bottom
  const sx = (x: number): number => M.left + ((x - xMin) / (xMax - xMin)) * PW
  const sy = (y: number): number => M.top + PH - ((y - yMin) / (yMax - yMin)) * PH
  const clampY = (y: number): number => Math.min(yMax, Math.max(yMin, y))

  const chart = (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`${yLabel} / ${xLabel}`}>
      {xTicks.map((t) => (
        <g key={`x${t}`}>
          <line className="grid" x1={sx(t)} x2={sx(t)} y1={M.top} y2={M.top + PH} />
          <text className="axis" x={sx(t)} y={M.top + PH + 16} textAnchor="middle">
            {t}
          </text>
        </g>
      ))}
      {yTicks.map((t) => (
        <g key={`y${t}`}>
          <line className="grid" x1={M.left} x2={M.left + PW} y1={sy(t)} y2={sy(t)} />
          <text className="axis" x={M.left - 8} y={sy(t) + 4} textAnchor="end">
            {t}
          </text>
        </g>
      ))}

      <text className="axis-title" x={M.left + PW / 2} y={H - 8} textAnchor="middle">
        {xLabel}
      </text>
      <text className="axis-title" transform={`translate(16 ${M.top + PH / 2}) rotate(-90)`} textAnchor="middle">
        {yLabel}
      </text>

      <svg x={M.left} y={M.top} width={PW} height={PH} overflow="hidden">
        <g transform={`translate(${-M.left} ${-M.top})`}>
          {series.map((s) =>
            s.mode === 'dots' ? (
              <g key={s.id} style={{ fill: chartColor(s.color) }}>
                {s.points.map((p, i) =>
                  p ? <rect key={i} x={sx(p.x) - 3} y={sy(clampY(p.y)) - 3} width={6} height={6} /> : null
                )}
              </g>
            ) : (
              <path
                key={s.id}
                d={toPath(s.points, sx, sy)}
                style={{ stroke: chartColor(s.color) }}
                fill="none"
                strokeWidth={2}
                strokeLinejoin="round"
              />
            )
          )}
          {measureX !== undefined && measureX !== null && (
            <line
              x1={sx(measureX)}
              x2={sx(measureX)}
              y1={M.top}
              y2={M.top + PH}
              style={{ stroke: 'var(--danger)' }}
              strokeWidth={2}
              strokeDasharray="4 3"
            />
          )}
        </g>
      </svg>

      {markerY !== undefined && (
        <g>
          <title>{markerTitle}</title>
          <path className="marker" d={`M ${M.left - 1} ${sy(clampY(markerY))} l -8 -6 v 12 z`} />
        </g>
      )}

      {legend && (
        <g>
          {legend.map((l, i) => (
            <g key={l.label} transform={`translate(${M.left + PW - 8} ${M.top + 16 + i * 16})`}>
              <rect x={-10} y={-9} width={10} height={10} rx={2} style={{ fill: chartColor(l.color) }} />
              <text className="axis" x={-16} y={0} textAnchor="end" style={{ fill: chartColor(l.color) }}>
                {l.label}
              </text>
            </g>
          ))}
        </g>
      )}
    </svg>
  )

  // la versión imprimible usa siempre los colores del tema claro
  return (
    <div className={`px-chart ${className}`} data-theme={light ? 'light' : undefined}>
      {chart}
    </div>
  )
}

/**
 * Colores heredados de las pantallas originales (amarillo y celeste sobre negro) traducidos a
 * los colores de gráfico del tema; cualquier otro color se usa tal cual.
 */
const LEGACY_COLORS: Record<string, string> = {
  '#ffe14d': 'var(--chart-2)',
  '#4dd2ff': 'var(--chart-1)',
  '#ffffff': 'var(--ink)',
  '#e879f9': 'var(--chart-3)',
  '#4ade80': 'var(--chart-1)',
  '#facc15': 'var(--chart-2)'
}

export function chartColor(color: string): string {
  return LEGACY_COLORS[color.toLowerCase()] ?? color
}

function toPath(
  points: Array<ScopePoint | null>,
  sx: (x: number) => number,
  sy: (y: number) => number
): string {
  let d = ''
  let pen = false
  for (const p of points) {
    if (!p) {
      pen = false
      continue
    }
    d += `${pen ? 'L' : 'M'}${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)} `
    pen = true
  }
  return d
}

/** Genera ticks equiespaciados entre min y max */
export function ticks(min: number, max: number, count: number): number[] {
  const step = (max - min) / count
  return Array.from({ length: count + 1 }, (_, i) => Math.round((min + step * i) * 100) / 100)
}
