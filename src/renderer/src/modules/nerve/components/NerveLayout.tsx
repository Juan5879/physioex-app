import type { ReactNode } from 'react'
import { ToolbarPortal } from '@/shared/components/ToolbarSlot'
import { Panel } from '@/shared/components/ui'

/**
 * Distribución común de los tres experimentos, como la pantalla original:
 * reactivos | cámara del nervio | osciloscopio, con el estimulador y la tabla debajo.
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
  return (
    <div className="grid grid-cols-[200px_150px_minmax(0,1fr)] gap-3 p-3">
      <Panel className="row-span-2 flex flex-col gap-2">{reagents}</Panel>
      <div className="flex flex-col gap-2">{chamber}</div>
      <div className="flex min-w-0 flex-col rounded-2xl border-4 border-gray-400 bg-gray-300 p-2 shadow-xl">
        {scope}
        <div className="mt-2 flex flex-wrap items-center justify-end gap-3">{scopeActions}</div>
        <ToolbarPortal>{tools}</ToolbarPortal>
      </div>
      <Panel className="col-span-2">{stimulator}</Panel>
      <Panel className="col-span-3">{table}</Panel>
    </div>
  )
}
