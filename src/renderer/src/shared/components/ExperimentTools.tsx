import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { DataColumn } from './DataTable'
import { PlotData } from './PlotData'
import { PrintReport, PrintTable } from './PrintReport'
import { Button } from './ui'

interface ExperimentToolsProps<Row> {
  lab: string
  experiment: string
  columns: DataColumn<Row>[]
  rows: Row[]
  /** ejes iniciales de "Graficar datos"; sin esto no se ofrece la herramienta */
  plotDefaults?: { x: string; y: string }
  /** versión imprimible de la(s) gráfica(s); sin esto no se ofrece "Imprimir gráfica" */
  printableGraph?: ReactNode
  /** hoja de datos a la medida (por defecto, una tabla con las columnas) */
  printableData?: ReactNode
}

/**
 * Menú "Herramientas": Graficar datos, Imprimir datos, Imprimir gráfica.
 * Cada laboratorio ofrece sólo las herramientas que tenía en el original.
 */
export function ExperimentTools<Row>({
  lab,
  experiment,
  columns,
  rows,
  plotDefaults,
  printableGraph,
  printableData
}: ExperimentToolsProps<Row>): ReactNode {
  const { t } = useTranslation()
  const [open, setOpen] = useState<'plot' | 'printData' | 'printGraph' | null>(null)
  const close = (): void => setOpen(null)

  return (
    <div className="flex items-center gap-2">
      {plotDefaults && (
        <Button variant="ghost" onClick={() => setOpen('plot')}>
          📈 {t('common.plotData')}
        </Button>
      )}
      <Button variant="ghost" onClick={() => setOpen('printData')} disabled={rows.length === 0}>
        🖨️ {t('common.printData')}
      </Button>
      {printableGraph && (
        <Button variant="ghost" onClick={() => setOpen('printGraph')}>
          🖨️ {t('common.printGraph')}
        </Button>
      )}

      {open === 'plot' && plotDefaults && (
        <PlotData
          title={experiment}
          columns={columns}
          rows={rows}
          defaultX={plotDefaults.x}
          defaultY={plotDefaults.y}
          onClose={close}
        />
      )}
      {open === 'printData' && (
        <PrintReport lab={lab} experiment={experiment} onDone={close}>
          {printableData ?? (
            <PrintTable
              headers={columns.map((c) => c.header)}
              rows={rows.map((r) => columns.map((c) => c.format(r)))}
            />
          )}
        </PrintReport>
      )}
      {open === 'printGraph' && (
        <PrintReport lab={lab} experiment={experiment} onDone={close}>
          {printableGraph}
        </PrintReport>
      )}
    </div>
  )
}
