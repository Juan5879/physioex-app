import type { ReactNode } from 'react'

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
      <ellipse cx={cx} cy={150} rx={34} ry={40} fill={deflated ? '#7f1d1d' : '#9f1239'} stroke="#4c0519" />
      <ellipse cx={cx - 10} cy={138} rx={10} ry={14} fill="#fda4af" fillOpacity={0.3} />
    </g>
  )
  const piston = 220 + (s - 1) * 40
  return (
    <svg viewBox="0 0 240 280" className="mx-auto w-full max-w-[300px]">
      {surfactant !== undefined && (
        <g>
          <rect x={150} y={8} width={70} height={36} rx={8} fill="#e0f2fe" fillOpacity={0.3} stroke="#cbd5e1" />
          <rect x={153} y={44 - 33 * surfactant} width={64} height={33 * surfactant} rx={6} fill="#22d3ee" />
        </g>
      )}
      {bag && <ellipse cx={120} cy={22} rx={40} ry={18} fill="#a5b4fc" fillOpacity={0.7} stroke="#6366f1" />}
      <rect x={116} y={20} width={8} height={70} fill="#9ca3af" />
      <path d="M 30 260 V 110 Q 30 80 70 80 H 170 Q 210 80 210 110 V 260" fill="#e0f2fe" fillOpacity={0.12} stroke="#cbd5e1" strokeWidth={2} />
      {/* bronquios: su grosor sigue al radio */}
      <path d="M 120 90 L 82 118 M 120 90 L 158 118" stroke="#d1d5db" strokeWidth={radius * 2} strokeLinecap="round" />
      {lung(80, deflatedL)}
      {lung(160, deflatedR)}
      <rect x={34} y={piston} width={172} height={8} fill="#111827" />
      <rect x={116} y={piston + 8} width={8} height={270 - piston} fill="#6b7280" />
      <rect x={20} y={262} width={200} height={10} rx={2} fill="#374151" />
    </svg>
  )
}

/** Pantalla con rótulo a la derecha (como los resultados del original) */
export function ResultCell({ label, value }: { label: string; value: string }): ReactNode {
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-20 rounded border border-black bg-black px-2 py-1 text-right font-mono text-lg leading-tight text-lcd tabular-nums">
        {value || ' '}
      </div>
      <span className="text-sm">{label}</span>
    </div>
  )
}
