import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Oscilloscope, type ScopeSeries } from '@/shared/components/Oscilloscope'

/** Monitor de ventilación: litros (0–6) contra tiempo (0–60 s) */
export function AbScope({ series, light }: { series: ScopeSeries[]; light?: boolean }): ReactNode {
  const { t } = useTranslation('acidBase')
  return (
    <Oscilloscope
      xMax={60}
      yMax={6}
      xTicks={[0, 10, 20, 30, 40, 50, 60]}
      yTicks={[0, 1, 2, 3, 4, 5, 6]}
      xLabel={t('fields.time')}
      yLabel={t('fields.liters')}
      series={series}
      light={light}
    />
  )
}
