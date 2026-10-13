import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Oscilloscope, type ScopeSeries } from '@/shared/components/Oscilloscope'
import { Panel } from '@/shared/components/ui'
import { T_MAX, V_MAX } from '../model/respiratory'

export { BellJar, ResultCell } from '@/shared/components/Lungs'

/** Monitor: litros (0–6) contra tiempo (0–60 s) */
export function LungScope({ series, light }: { series: ScopeSeries[]; light?: boolean }): ReactNode {
  const { t } = useTranslation('respiratory')
  return (
    <Oscilloscope
      xMax={T_MAX}
      yMax={V_MAX}
      xTicks={[0, 10, 20, 30, 40, 50, 60]}
      yTicks={[0, 1, 2, 3, 4, 5, 6]}
      xLabel={t('fields.time')}
      yLabel={t('fields.liters')}
      series={series}
      light={light}
    />
  )
}

/** Distribución común: aparato | monitor, controles y resultados debajo, tabla al final */
export function RespLayout({
  apparatus,
  controls,
  scope,
  scopeActions,
  results,
  table
}: {
  apparatus: ReactNode
  controls: ReactNode
  scope: ReactNode
  scopeActions: ReactNode
  results: ReactNode
  table: ReactNode
}): ReactNode {
  const { t } = useTranslation('respiratory')
  return (
    <>
      <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] items-start gap-4">
        <Panel title={t('panels.apparatus')}>
          <div className="px-well p-4">{apparatus}</div>
          {controls}
        </Panel>
        <Panel title={t('panels.spirometer')}>
          <div>
            {scope}
            <div className="px-chart__bar justify-end">{scopeActions}</div>
          </div>
          <div className="px-section">{results}</div>
        </Panel>
      </div>
      {table}
    </>
  )
}
