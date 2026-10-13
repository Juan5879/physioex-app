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
  return (
    <svg viewBox="0 0 460 300" className="mx-auto block max-h-[320px] w-full" role="img" aria-label={t('panels.nephron')}>
      <rect className="il-glass" x={5} y={5} width={450} height={260} rx={24} />
      {/* médula: se oscurece con el gradiente */}
      <rect x={140} y={120} width={150} height={140} style={{ fill: 'var(--signal)' }} fillOpacity={0.06 + 0.4 * (gradient ?? 0.3)} />
      {/* arteriolas */}
      <rect x={0} y={60} width={60} height={afferent * 40} style={{ fill: flowing ? 'var(--chart-4)' : 'var(--border-strong)' }} />
      <rect x={0} y={100} width={60} height={efferent * 40} style={{ fill: flowing ? 'var(--chart-4)' : 'var(--border-strong)' }} opacity={0.75} />
      {/* glomérulo y cápsula */}
      <circle cx={90} cy={85} r={42} className="il-electrode" style={{ fill: 'var(--surface-raised)' }} strokeWidth={3} />
      <circle className="il-tissue" cx={90} cy={85} r={28} opacity={flowing ? 1 : 0.45} />
      <text className="il-label" x={90} y={150} textAnchor="middle">
        {t('panels.glomerulus').toUpperCase()}
      </text>
      {/* túbulo proximal → asa → distal → colector */}
      <path
        className="il-liquid-stroke"
        d="M 130 85 H 165 V 240 Q 165 255 180 255 H 250 Q 265 255 265 240 V 60 H 360 V 230"
        strokeWidth={18}
        opacity={urineFlowing ? 1 : 0.55}
      />
      {coating && <rect x={350} y={60} width={20} height={170} style={{ fill: coating }} fillOpacity={0.45} />}
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
        <rect className={valveOpen ? 'il-glass' : 'il-metal'} x={340} y={228} width={40} height={30} rx={6} />
        <title>{t(valveOpen ? 'actions.valveOpen' : 'actions.valveClosed')}</title>
      </g>
    </svg>
  )
}

/** Vaso con nivel 0–1 y color */
export function Beaker({ level, color, label }: { level: number; color: string; label?: string }): ReactNode {
  const h = 70 * Math.max(0, Math.min(1, level))
  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 60 90" className="h-20 w-14">
        <rect className="il-glass" x={5} y={5} width={50} height={78} rx={6} />
        <rect x={9} y={79 - h} width={42} height={h} rx={4} style={{ fill: color }} />
      </svg>
      {label && <span className="il-label text-[11px]">{label}</span>}
    </div>
  )
}
