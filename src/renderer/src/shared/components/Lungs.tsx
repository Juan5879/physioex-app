import type { ReactNode } from 'react'
import { splitUnit } from '@/shared/lib/format'
import { Readout } from './ui'

/**
 * Campana con los pulmones colgando de la tráquea y el émbolo (diafragma) abajo.
 * `scale` es el lungScale del original (100 = reposo).
 */
export function BellJar({
  scale,
  deflatedL = false,
  deflatedR = false,
  radius,
  bag,
  surfactant
}: {
  scale: number
  deflatedL?: boolean
  deflatedR?: boolean
  radius: number
  /** bolsa de reinhalación inflada */
  bag?: boolean
  /** nivel del depósito de surfactante (0–1) */
  surfactant?: number
}): ReactNode {
  const s = Math.max(0.5, Math.min(1.6, scale / 100))
  const lung = (cx: number, deflated: boolean): ReactNode => (
    <g style={{ transformOrigin: `${cx}px 120px`, transform: `scale(${deflated ? 0.45 : s})`, transition: 'transform 60ms linear' }}>
      <ellipse className="il-tissue" cx={cx} cy={150} rx={34} ry={40} opacity={deflated ? 0.55 : 1} />
    </g>
  )
  const piston = 220 + (s - 1) * 40
  return (
    <svg viewBox="0 0 240 280" className="mx-auto block w-full max-w-[260px]">
      {surfactant !== undefined && (
        <g>
          <rect className="il-glass" x={150} y={8} width={70} height={36} rx={8} />
          <rect className="il-liquid" x={153} y={44 - 33 * surfactant} width={64} height={33 * surfactant} rx={6} />
        </g>
      )}
      {bag && <ellipse cx={120} cy={22} rx={40} ry={18} style={{ fill: 'var(--chart-3)' }} fillOpacity={0.5} />}
      <path className="il-glass" d="M 30 260 V 110 Q 30 80 70 80 H 170 Q 210 80 210 110 V 260" />
      <rect className="il-metal" x={117} y={20} width={6} height={70} />
      {/* bronquios: su grosor sigue al radio */}
      <path d="M 120 90 L 82 118 M 120 90 L 158 118" stroke="var(--border-strong)" strokeWidth={radius * 2} strokeLinecap="round" />
      {lung(80, deflatedL)}
      {lung(160, deflatedR)}
      <rect className="il-metal" x={34} y={piston} width={172} height={8} rx={2} />
      <rect className="il-metal" x={117} y={piston + 8} width={6} height={270 - piston} />
      <rect className="il-metal" x={20} y={262} width={200} height={6} rx={3} />
    </svg>
  )
}

/** Medición de la grilla de resultados (`.px-metric`): rótulo y visor; la unidad del rótulo pasa al visor */
export function ResultCell({ label, value }: { label: string; value: string }): ReactNode {
  const split = splitUnit(label)
  return (
    <div className="px-metric">
      <span className="px-label">{split ? split.text : label}</span>
      <Readout value={value} unit={split?.unit} />
    </div>
  )
}
