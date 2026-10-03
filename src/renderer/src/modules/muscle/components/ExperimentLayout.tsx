import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ToolbarPortal } from '@/shared/components/ToolbarSlot'
import { Button, Panel, Readout } from '@/shared/components/ui'
import { TIME_SCALES } from '../model/constants'

interface ExperimentLayoutProps {
  apparatus: ReactNode
  /** controles bajo el aparato (longitud del músculo, plataforma, pesas) */
  apparatusControls: ReactNode
  /** osciloscopio(s) */
  scope: ReactNode
  /** acciones bajo la pantalla (limpiar trazos, escala de tiempo) */
  scopeActions: ReactNode
  stimulator: ReactNode
  table: ReactNode
  /** menú de herramientas (graficar / imprimir) */
  tools: ReactNode
}

/**
 * Distribución común de los cuatro experimentos, inspirada en la pantalla original:
 * aparato | osciloscopio | estimulador, con la tabla de datos debajo.
 */
export function ExperimentLayout({
  apparatus,
  apparatusControls,
  scope,
  scopeActions,
  stimulator,
  table,
  tools
}: ExperimentLayoutProps): ReactNode {
  return (
    <div className="grid grid-cols-[210px_minmax(0,1fr)_240px] gap-3 p-3">
      <div className="row-span-2 flex flex-col gap-3">
        <div className="rounded-xl bg-gradient-to-b from-bench-50/15 to-bench-50/5 p-2">{apparatus}</div>
        <Panel>{apparatusControls}</Panel>
      </div>
      <div className="flex min-w-0 flex-col rounded-2xl border-4 border-gray-400 bg-gray-300 p-2 shadow-xl">
        {scope}
        <div className="mt-2 flex flex-wrap items-center justify-end gap-3">{scopeActions}</div>
        <ToolbarPortal>{tools}</ToolbarPortal>
      </div>
      <Panel className="flex flex-col justify-center">{stimulator}</Panel>
      <Panel className="col-span-2">{table}</Panel>
    </div>
  )
}

/** Lecturas de fuerza activa / pasiva / total */
export function ForceReadouts({
  active,
  passive,
  total
}: {
  active: string
  passive: string
  total: string
}): ReactNode {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-sm font-semibold text-bench-100">{t('muscle:fields.force')}</span>
      <div className="grid grid-cols-[auto_auto] items-center gap-x-2 gap-y-1">
        <Readout value={active} />
        <span className="text-sm">{t('common.active')}</span>
        <Readout value={passive} />
        <span className="text-sm">{t('common.passive')}</span>
        <Readout value={total} />
        <span className="text-sm">{t('common.total')}</span>
      </div>
    </div>
  )
}

/** Selector de escala de tiempo (slider de 9 posiciones del original) */
export function TimeScaleSelect({
  value,
  onChange,
  disabled
}: {
  value: number
  onChange: (v: number) => void
  disabled?: boolean
}): ReactNode {
  const { t } = useTranslation()
  // el slider original iba de 1000 ms (izquierda) a 200 ms (derecha)
  const scales = [...TIME_SCALES].reverse()
  const index = scales.indexOf(value as (typeof TIME_SCALES)[number])
  return (
    <label className="flex items-center gap-2 text-sm text-bench-900">
      <span className="font-semibold">{t('common.timeScale')}</span>
      <input
        type="range"
        min={0}
        max={scales.length - 1}
        step={1}
        value={index}
        disabled={disabled}
        onChange={(e) => onChange(scales[Number(e.target.value)])}
        className="w-40 accent-sky-600"
      />
      <span className="w-16 font-mono">{value} ms</span>
    </label>
  )
}

export function ClearButton({
  onClick,
  disabled,
  children
}: {
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}): ReactNode {
  return (
    <Button onClick={onClick} disabled={disabled} className="border border-gray-500 bg-gray-100">
      {children}
    </Button>
  )
}
