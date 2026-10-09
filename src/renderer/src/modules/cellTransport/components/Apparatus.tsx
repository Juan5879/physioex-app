import type { DragEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { SoluteId } from '../model/constants'
import type { Conc } from '../model/transport'

/** colores del líquido del original (setRGB): azul, blanco con albúmina, gris con carbón */
export function liquidColor(conc: Conc): string {
  if ((conc.Albu ?? 0) > 0) return '#e0e0e0'
  if ((conc.PoCh ?? 0) > 0) return '#999999'
  return '#66cccc'
}

/** color de cada membrana de diálisis (como los tubos del soporte) */
export const MEMBRANE_COLORS: Record<number, string> = {
  20: '#ef4444',
  50: '#d946ef',
  100: '#3b82f6',
  200: '#22c55e'
}
export const BUILT_MEMBRANE_COLOR = '#cbd5e1'

export interface BeakerView {
  /** 0 = vacío, 1 = lleno; el CSS anima el cambio como el llenado del original */
  level: number
  color: string
}

function Beaker({ x, y, w, h, view }: { x: number; y: number; w: number; h: number; view: BeakerView }): ReactNode {
  const liquid = (h - 14) * view.level
  return (
    <g>
      {/* tapa */}
      <rect x={x - 4} y={y - 12} width={w + 8} height={12} rx={3} fill="#1f2937" />
      <rect x={x + w / 2 - 18} y={y - 18} width={36} height={7} rx={2} fill="#4b5563" />
      {/* vidrio */}
      <rect x={x} y={y} width={w} height={h} rx={8} fill="#e5f3f8" fillOpacity={0.25} stroke="#cbd5e1" strokeWidth={2} />
      <rect
        x={x + 3}
        y={y + h - 4 - liquid}
        width={w - 6}
        height={liquid}
        rx={5}
        fill={view.color}
        fillOpacity={0.85}
        style={{ transition: 'y 600ms ease, height 600ms ease, fill 300ms' }}
      />
      <rect x={x + 8} y={y + 8} width={8} height={h - 24} rx={4} fill="#fff" fillOpacity={0.35} />
      {/* base */}
      <rect x={x - 2} y={y + h} width={w + 4} height={8} rx={2} fill="#374151" />
    </g>
  )
}

/**
 * Dos vasos unidos por tubos con el soporte de membrana en el centro
 * (difusión simple, facilitada, ósmosis y transporte activo).
 */
export function BeakerPair({
  left,
  right,
  membraneColor,
  running,
  onDropMembrane,
  onHolderClick
}: {
  left: BeakerView
  right: BeakerView
  membraneColor: string | null
  running: boolean
  onDropMembrane?: (data: string) => void
  onHolderClick?: () => void
}): ReactNode {
  const { t } = useTranslation('cellTransport')
  const onDrop = (e: DragEvent): void => {
    e.preventDefault()
    const data = e.dataTransfer.getData('text/membrane')
    if (data && onDropMembrane) onDropMembrane(data)
  }
  return (
    <svg
      viewBox="0 0 400 200"
      className="mx-auto w-full max-w-[520px]"
      onDragOver={(e) => onDropMembrane && e.preventDefault()}
      onDrop={onDrop}
    >
      <Beaker x={20} y={30} w={130} h={150} view={left} />
      <Beaker x={250} y={30} w={130} h={150} view={right} />
      {/* tubos entre vasos */}
      <path d="M 150 50 H 180 V 70 M 250 50 H 220 V 70" fill="none" stroke="#9ca3af" strokeWidth={5} />
      <path d="M 150 160 H 180 V 140 M 250 160 H 220 V 140" fill="none" stroke="#9ca3af" strokeWidth={5} />
      {/* soporte de membrana */}
      <g onClick={onHolderClick} className={onHolderClick ? 'cursor-pointer' : ''}>
        <title>{t('panels.holder')}</title>
        <rect x={176} y={64} width={48} height={82} rx={4} fill="#a16207" stroke="#713f12" strokeWidth={2} />
        <rect x={182} y={70} width={36} height={70} fill="#111827" />
        {membraneColor && (
          <rect
            x={194}
            y={66}
            width={12}
            height={78}
            rx={3}
            fill={membraneColor}
            stroke={running ? '#fde047' : '#1f2937'}
            strokeWidth={running ? 2 : 1}
          />
        )}
      </g>
    </svg>
  )
}

/** Vaso superior, filtro y vaso inferior del experimento de filtración */
export function FiltrationApparatus({
  top,
  bottom,
  membraneColor,
  onDropMembrane,
  onHolderClick
}: {
  top: BeakerView
  bottom: BeakerView
  membraneColor: string | null
  onDropMembrane?: (data: string) => void
  onHolderClick?: () => void
}): ReactNode {
  const { t } = useTranslation('cellTransport')
  return (
    <svg
      viewBox="0 0 200 400"
      className="mx-auto h-full max-h-[460px] w-full"
      onDragOver={(e) => onDropMembrane && e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        const data = e.dataTransfer.getData('text/membrane')
        if (data && onDropMembrane) onDropMembrane(data)
      }}
    >
      <Beaker x={35} y={30} w={130} h={150} view={top} />
      <g onClick={onHolderClick} className={onHolderClick ? 'cursor-pointer' : ''}>
        <title>{t('panels.holder')}</title>
        <rect x={30} y={190} width={140} height={26} rx={4} fill="#a16207" stroke="#713f12" strokeWidth={2} />
        <rect x={40} y={196} width={120} height={14} fill="#111827" />
        {membraneColor && <rect x={42} y={199} width={116} height={8} rx={3} fill={membraneColor} />}
      </g>
      <Beaker x={35} y={238} w={130} h={150} view={bottom} />
    </svg>
  )
}

/** Tabla "Soluto / Concentración" sobre cada vaso */
export function ConcentrationTable({
  solutes,
  values,
  unit
}: {
  solutes: SoluteId[]
  /** `null` = vaso vacío (sin nombres ni valores) */
  values: Conc | null
  unit: string
}): ReactNode {
  const { t } = useTranslation('cellTransport')
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="text-bench-100">
          <th className="px-1 font-semibold">{t('fields.solute')}</th>
          <th className="px-1 font-semibold">
            {t('fields.concentration')} ({unit})
          </th>
        </tr>
      </thead>
      <tbody className="font-mono text-lcd">
        {solutes.map((s) => (
          <tr key={s} className="border-t border-bench-700 bg-black">
            <td className="px-2 py-0.5 text-center">{values ? t(`solutes.${s}`) : '\u00a0'}</td>
            <td className="px-2 py-0.5 text-right tabular-nums">{values ? fix(values[s] ?? 0, 3) : ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** f_fixString: redondea y rellena con ceros */
export function fix(v: number, decimals: number): string {
  const m = 10 ** decimals
  return (Math.round(v * m) / m).toFixed(decimals)
}
