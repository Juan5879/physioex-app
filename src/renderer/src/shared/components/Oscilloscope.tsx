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

const M = { top: 12, right: 16, bottom: 44, left: 52 }

/** Pantalla de osciloscopio genérica en SVG (escala y redimensiona sin perder nitidez) */
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

  const fg = light ? '#111827' : '#1e293b'
  const grid = light ? '#d1d5db' : '#3f4a5a'
  const screen = light ? '#ffffff' : '#000000'

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={`w-full rounded-lg ${light ? 'bg-white' : 'bg-bench-50'} ${className}`}
      role="img"
    >
      <rect x={M.left} y={M.top} width={PW} height={PH} fill={screen} />

      {xTicks.map((t) => (
        <g key={`x${t}`}>
          <line x1={sx(t)} x2={sx(t)} y1={M.top} y2={M.top + PH} stroke={grid} strokeWidth={1} />
          <text x={sx(t)} y={M.top + PH + 16} textAnchor="middle" fontSize={12} fill={fg}>
            {t}
          </text>
        </g>
      ))}
      {yTicks.map((t) => (
        <g key={`y${t}`}>
          <line x1={M.left} x2={M.left + PW} y1={sy(t)} y2={sy(t)} stroke={grid} strokeWidth={1} />
          <text x={M.left - 8} y={sy(t) + 4} textAnchor="end" fontSize={12} fill={fg}>
            {t}
          </text>
        </g>
      ))}

      <text x={M.left + PW / 2} y={H - 8} textAnchor="middle" fontSize={13} fontWeight={700} fill={fg}>
        {xLabel}
      </text>
      <text
        transform={`translate(16 ${M.top + PH / 2}) rotate(-90)`}
        textAnchor="middle"
        fontSize={13}
        fontWeight={700}
        fill={fg}
      >
        {yLabel}
      </text>

      <svg x={M.left} y={M.top} width={PW} height={PH} overflow="hidden">
        <g transform={`translate(${-M.left} ${-M.top})`}>
          {series.map((s) =>
            s.mode === 'dots' ? (
              <g key={s.id} fill={s.color}>
                {s.points.map((p, i) =>
                  p ? <rect key={i} x={sx(p.x) - 3} y={sy(clampY(p.y)) - 3} width={6} height={6} /> : null
                )}
              </g>
            ) : (
              <path
                key={s.id}
                d={toPath(s.points, sx, sy)}
                fill="none"
                stroke={s.color}
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
              stroke="#f43f5e"
              strokeWidth={2}
            />
          )}
        </g>
      </svg>

      {markerY !== undefined && (
        <g>
          <title>{markerTitle}</title>
          <path
            d={`M ${M.left - 2} ${sy(clampY(markerY))} l -10 -6 v 12 z`}
            fill="#ef4444"
            stroke="#7f1d1d"
          />
        </g>
      )}

      {legend && (
        <g>
          {legend.map((l, i) => (
            <g key={l.label} transform={`translate(${M.left + PW - 8} ${M.top + 16 + i * 16})`}>
              <rect x={-10} y={-9} width={10} height={10} fill={l.color} />
              <text x={-16} y={0} textAnchor="end" fontSize={12} fill={l.color}>
                {l.label}
              </text>
            </g>
          ))}
        </g>
      )}
    </svg>
  )
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
