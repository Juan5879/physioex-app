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
  return (
    <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-3 p-3">
      <div className="flex flex-col gap-3">
        <div className="rounded-xl bg-gradient-to-b from-bench-50/15 to-bench-50/5 p-2">{apparatus}</div>
        <Panel>{controls}</Panel>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex min-w-0 flex-col rounded-2xl border-4 border-gray-400 bg-gray-300 p-2 shadow-xl">
          {scope}
          <div className="mt-2 flex justify-end gap-2">{scopeActions}</div>
        </div>
        <Panel>{results}</Panel>
      </div>
      <Panel className="col-span-2">{table}</Panel>
    </div>
  )
}
