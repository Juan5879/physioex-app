import type { DragEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { MiniTable } from '@/shared/components/ui'
import type { SoluteId } from '../model/constants'
import type { Conc } from '../model/transport'

/** color del líquido como el original (setRGB): agua, blanco con albúmina, gris con carbón */
export function liquidColor(conc: Conc): string {
  if ((conc.Albu ?? 0) > 0) return 'var(--scale-4)'
  if ((conc.PoCh ?? 0) > 0) return 'var(--ink-subtle)'
  return 'var(--scale-2)'
}

/** color de cada membrana de diálisis: escala del tema, más poro = más claro */
export const MEMBRANE_COLORS: Record<number, string> = {
  20: 'var(--scale-1)',
  50: 'var(--scale-2)',
  100: 'var(--scale-3)',
  200: 'var(--scale-4)'
}
export const BUILT_MEMBRANE_COLOR = 'var(--accent)'

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
      <rect className="il-metal" x={x - 4} y={y - 10} width={w + 8} height={5} rx={2} />
      {/* vidrio */}
      <rect className="il-glass" x={x} y={y} width={w} height={h} rx={8} />
      <rect
        x={x + 3}
        y={y + h - 4 - liquid}
        width={w - 6}
        height={liquid}
        rx={5}
        style={{ fill: view.color, transition: 'y 600ms ease, height 600ms ease, fill 300ms' }}
      />
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
      className="mx-auto block w-full max-w-[460px]"
      onDragOver={(e) => onDropMembrane && e.preventDefault()}
      onDrop={onDrop}
    >
      <Beaker x={20} y={30} w={130} h={150} view={left} />
      <Beaker x={250} y={30} w={130} h={150} view={right} />
      {/* tubos entre vasos */}
      <path className="il-line" d="M 150 85 H 176 M 250 85 H 224 M 150 125 H 176 M 250 125 H 224" />
      <text className="il-label" x={85} y={14} textAnchor="middle">{t('beaker.leftShort')}</text>
      <text className="il-label" x={315} y={14} textAnchor="middle">{t('beaker.rightShort')}</text>
      {/* soporte de membrana */}
      <g onClick={onHolderClick} className={onHolderClick ? 'cursor-pointer' : ''}>
        <title>{t('panels.holder')}</title>
        <rect className={membraneColor ? 'il-glass' : 'il-mark'} x={180} y={66} width={40} height={78} rx={4} />
        {membraneColor && (
          <rect
            className={running ? 'il-electrode' : undefined}
            x={192}
            y={70}
            width={16}
            height={70}
            rx={4}
            style={{ fill: membraneColor }}
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
      className="mx-auto block h-full max-h-[420px] w-full"
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
        <rect className={membraneColor ? 'il-glass' : 'il-mark'} x={30} y={192} width={140} height={22} rx={4} />
        {membraneColor && <rect x={40} y={198} width={120} height={10} rx={4} style={{ fill: membraneColor }} />}
      </g>
      <Beaker x={35} y={238} w={130} h={150} view={bottom} />
    </svg>
  )
}

/** Tabla «Soluto / Concentración» de cada vaso; vacía si el vaso no tiene solución */
export function ConcentrationTable({
  solutes,
  values,
  unit
}: {
  solutes: SoluteId[]
  /** `null` = vaso vacío */
  values: Conc | null
  unit: string
}): ReactNode {
  const { t } = useTranslation('cellTransport')
  return (
    <MiniTable
      headers={[t('fields.solute'), `${t('fields.concentration')} (${unit})`]}
      rows={values && solutes.map((s) => [t(`solutes.${s}`), fix(values[s] ?? 0, 3)])}
      empty={t('beaker.empty')}
    />
  )
}

/** f_fixString: redondea y rellena con ceros */
export function fix(v: number, decimals: number): string {
  const m = 10 ** decimals
  return (Math.round(v * m) / m).toFixed(decimals)
}
