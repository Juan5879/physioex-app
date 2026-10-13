import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ToolbarPortal } from '@/shared/components/ToolbarSlot'
import { Button, Light, Panel, Readout } from '@/shared/components/ui'
import { TIME_SCALES } from '../model/constants'

interface ExperimentLayoutProps {
  apparatus: ReactNode
  /** controles bajo el aparato (longitud del músculo, plataforma, pesas) */
  apparatusControls: ReactNode
  /** osciloscopio(s) */
  scope: ReactNode
  /** barra bajo el gráfico (escala de tiempo, limpiar trazos) */
  scopeActions: ReactNode
  stimulator: ReactNode
  table: ReactNode
  /** menú de herramientas (graficar / imprimir) */
  tools: ReactNode
  /** estimulando: enciende el LED del estimulador */
  running: boolean
  /** cantidad de trazos en el gráfico */
  traceCount: number
}

/**
 * Distribución común de los cuatro experimentos:
 * Preparación | Registro | Estimulador, con Resultados a todo el ancho debajo.
 */
export function ExperimentLayout({
  apparatus,
  apparatusControls,
  scope,
  scopeActions,
  stimulator,
  table,
  tools,
  running,
  traceCount
}: ExperimentLayoutProps): ReactNode {
  const { t } = useTranslation()
  return (
    <>
      <ToolbarPortal>{tools}</ToolbarPortal>
      <div className="grid grid-cols-[230px_minmax(0,1fr)_260px] items-stretch gap-4">
        <Panel title={t('common.preparation')}>
          <div className="px-well px-2 py-4">{apparatus}</div>
          {apparatusControls}
        </Panel>
        <Panel
          title={t('common.recording')}
          actions={<span className="px-eyebrow">{t('common.traces', { count: traceCount })}</span>}
          bodyClassName="!gap-0"
        >
          {scope}
          <div className="px-chart__bar justify-end">{scopeActions}</div>
        </Panel>
        <Panel
          title={t('common.stimulator')}
          actions={<Light on={running} label={running ? t('common.inProgress') : t('common.ready')} />}
        >
          {stimulator}
        </Panel>
      </div>
      {table}
    </>
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
    <div className="px-section">
      <span className="px-panel__title">{t('common.force')}</span>
      <div className="px-row">
        <span className="px-label">{t('common.active')}</span>
        <Readout value={active} unit="g" />
      </div>
      <div className="px-row">
        <span className="px-label">{t('common.passive')}</span>
        <Readout value={passive} unit="g" />
      </div>
      <div className="px-row">
        <span className="px-label">{t('common.total')}</span>
        <Readout value={total} unit="g" />
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
    <label className="mr-auto flex items-center gap-3">
      <span>{t('common.timeScale')}</span>
      <input
        type="range"
        min={0}
        max={scales.length - 1}
        step={1}
        value={index}
        disabled={disabled}
        onChange={(e) => onChange(scales[Number(e.target.value)])}
        className="px-range"
      />
      <span className="w-16 font-mono text-[color:var(--ink)]">{value} ms</span>
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
    <Button size="sm" icon="eraser" onClick={onClick} disabled={disabled}>
      {children}
    </Button>
  )
}
