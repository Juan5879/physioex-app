import type { MouseEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Segment } from '../model/renal'

/**
 * Nefrona simulada: glomérulo con arteriolas aferente y eferente, asa de Henle, túbulo distal y
 * conducto colector con la válvula; el fondo de la médula se oscurece con el gradiente.
 */
export function Nephron({
  afferent,
  efferent,
  flowing,
  urineFlowing,
  valveOpen,
  onToggleValve,
  gradient,
  coating,
  onProbe
}: {
  afferent: number
  efferent: number
  /** sangre pasando por las arteriolas */
  flowing: boolean
  urineFlowing: boolean
  valveOpen: boolean
  onToggleValve?: () => void
  /** 0–1: intensidad del gradiente medular */
  gradient?: number
  /** color de las hormonas agregadas al túbulo */
  coating?: string | null
  /** con la sonda activa, clic sobre un segmento con su posición (0–1) */
  onProbe?: (segment: Segment, pos: number) => void
}): ReactNode {
  const { t } = useTranslation('renal')
  const probe = (segment: Segment, axis: 'y' | 'x', from: number, span: number) => (e: MouseEvent<SVGElement>) => {
    if (!onProbe) return
    const svg = e.currentTarget.ownerSVGElement
    if (!svg) return
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const p = pt.matrixTransform(svg.getScreenCTM()?.inverse())
    const v = axis === 'y' ? p.y : p.x
    onProbe(segment, Math.max(0, Math.min(1, (v - from) / span)))
  }
  const hit = onProbe ? 'cursor-crosshair' : ''
  const tube = '#fbbf24'
  return (
    <svg viewBox="0 0 460 300" className="mx-auto max-h-[340px] w-full">
      <defs>
        <linearGradient id="medulla" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fde68a" stopOpacity={0.15} />
          <stop offset="1" stopColor="#b45309" stopOpacity={0.15 + 0.6 * (gradient ?? 0.3)} />
        </linearGradient>
      </defs>
      <rect x={5} y={5} width={450} height={260} rx={24} fill="#fde047" fillOpacity={0.55} stroke="#a16207" strokeWidth={2} />
      <rect x={140} y={120} width={150} height={140} fill="url(#medulla)" />
      {/* arteriolas */}
      <rect x={0} y={60} width={60} height={afferent * 40} fill={flowing ? '#dc2626' : '#cbd5e1'} fillOpacity={0.8} />
      <rect x={0} y={100} width={60} height={efferent * 40} fill={flowing ? '#991b1b' : '#cbd5e1'} fillOpacity={0.8} />
      {/* glomérulo y cápsula */}
      <circle cx={90} cy={85} r={42} fill="#fcd34d" stroke="#b45309" strokeWidth={3} />
      <circle cx={90} cy={85} r={28} fill={flowing ? '#ef4444' : '#fecaca'} fillOpacity={0.8} />
      {/* túbulo proximal → asa → distal → colector */}
      <path d="M 130 85 H 165 V 240 Q 165 255 180 255 H 250 Q 265 255 265 240 V 60 H 360 V 230" fill="none" stroke={tube} strokeWidth={22} strokeLinejoin="round" />
      <path d="M 130 85 H 165 V 240 Q 165 255 180 255 H 250 Q 265 255 265 240 V 60 H 360 V 230" fill="none" stroke={urineFlowing ? '#facc15' : '#fef3c7'} strokeWidth={10} strokeLinejoin="round" />
      {coating && <rect x={350} y={60} width={20} height={170} fill={coating} fillOpacity={0.45} />}
      {/* zonas de la sonda */}
      {onProbe && (
        <g className={hit} fill="transparent">
          <title>{t('hints.probe')}</title>
          <rect x={153} y={120} width={24} height={122} onClick={probe('descending', 'y', 120, 122)} />
          <rect x={253} y={120} width={24} height={122} onClick={probe('ascending', 'y', 120, 122)} />
          <rect x={165} y={244} width={100} height={24} onClick={probe('loop', 'x', 165, 100)} />
          <rect x={270} y={48} width={80} height={24} onClick={probe('distal', 'x', 270, 80)} />
          <rect x={348} y={97} width={24} height={133} onClick={probe('collecting', 'y', 97, 133)} />
          <rect x={330} y={262} width={60} height={36} onClick={probe('urine', 'y', 262, 36)} />
        </g>
      )}
      {/* válvula y vaso de orina */}
      <g onClick={onToggleValve} className={onToggleValve ? 'cursor-pointer' : ''}>
        <rect x={340} y={228} width={40} height={30} rx={4} fill="#6b7280" stroke="#111827" />
        <text x={360} y={247} textAnchor="middle" fontSize={10} fill="#f9fafb">
          {valveOpen ? 'open' : 'closed'}
        </text>
      </g>
    </svg>
  )
}

/** Vaso con nivel 0–1 y color */
export function Beaker({ level, color, label }: { level: number; color: string; label?: string }): ReactNode {
  const h = 70 * Math.max(0, Math.min(1, level))
  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 60 90" className="h-24 w-16">
        <rect x={5} y={5} width={50} height={78} rx={4} fill="#e0f2fe" fillOpacity={0.15} stroke="#cbd5e1" strokeWidth={2} />
        <rect x={8} y={80 - h} width={44} height={h} rx={3} fill={color} />
      </svg>
      {label && <span className="text-xs text-bench-300">{label}</span>}
    </div>
  )
}
