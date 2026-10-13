import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ToolbarPortal } from '@/shared/components/ToolbarSlot'
import { Panel } from '@/shared/components/ui'

/**
 * Distribución común de los tres experimentos:
 * Preparación (cámara del nervio y agentes) | Osciloscopio | Estimulador, con Resultados debajo.
 */
export function NerveLayout({
  reagents,
  chamber,
  scope,
  scopeActions,
  stimulator,
  table,
  tools
}: {
  reagents: ReactNode
  chamber: ReactNode
  scope: ReactNode
  scopeActions: ReactNode
  stimulator: ReactNode
  table: ReactNode
  tools: ReactNode
}): ReactNode {
  const { t } = useTranslation()
  const tn = useTranslation('nerve').t
  return (
    <>
      <ToolbarPortal>{tools}</ToolbarPortal>
      <div className="grid grid-cols-[250px_minmax(0,1fr)_250px] items-start gap-4">
        <Panel title={t('common.preparation')}>
          {chamber}
          <div className="grid gap-2">{reagents}</div>
        </Panel>
        <Panel title={tn('panels.scope')} bodyClassName="!gap-0">
          {scope}
          <div className="px-chart__bar justify-end">{scopeActions}</div>
        </Panel>
        <Panel title={t('common.stimulator')}>{stimulator}</Panel>
      </div>
      {table}
    </>
  )
}
