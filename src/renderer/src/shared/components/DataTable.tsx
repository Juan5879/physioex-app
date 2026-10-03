import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Modal } from './ui'

export interface DataColumn<Row> {
  key: string
  header: ReactNode
  /** valor numérico (para graficar) */
  value: (row: Row) => number
  /** texto mostrado */
  format: (row: Row) => string
}

interface DataTableProps<Row> {
  columns: DataColumn<Row>[]
  rows: Row[]
  selected: number | null
  onSelect: (index: number | null) => void
  onRecord: () => void
  onDelete: (index: number) => void
  onClear: () => void
  canRecord: boolean
}

/**
 * Tabla de resultados con los botones "Registrar datos", "Borrar línea" y "Limpiar tabla".
 * El original mostraba 4 filas con flechas de desplazamiento; aquí la tabla hace scroll.
 */
export function DataTable<Row>({
  columns,
  rows,
  selected,
  onSelect,
  onRecord,
  onDelete,
  onClear,
  canRecord
}: DataTableProps<Row>): ReactNode {
  const { t } = useTranslation()
  const [confirmClear, setConfirmClear] = useState(false)

  return (
    <div className="flex gap-3">
      <div className="flex w-36 shrink-0 flex-col gap-1.5">
        <Button onClick={onRecord} disabled={!canRecord}>
          {t('common.recordData')}
        </Button>
        <Button onClick={() => selected !== null && onDelete(selected)} disabled={selected === null}>
          {t('common.deleteLine')}
        </Button>
        <Button onClick={() => setConfirmClear(true)} disabled={rows.length === 0}>
          {t('common.clearTable')}
        </Button>
      </div>

      <div className="h-32 flex-1 overflow-y-auto rounded border border-black bg-black">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-bench-600">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="px-2 py-1 text-center font-semibold whitespace-nowrap">
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="font-mono text-lcd">
            {rows.map((row, i) => (
              <tr
                key={i}
                onClick={() => onSelect(selected === i ? null : i)}
                className={`cursor-pointer border-t border-bench-700 ${selected === i ? 'bg-sky-700 text-white' : 'hover:bg-bench-800'}`}
              >
                {columns.map((c) => (
                  <td key={c.key} className="px-2 py-1 text-center tabular-nums">
                    {c.format(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {confirmClear && (
        <Modal title={t('common.clearTable')} onClose={() => setConfirmClear(false)}>
          <p className="mb-5 text-bench-100">{t('common.confirmClearTable')}</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmClear(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                onClear()
                setConfirmClear(false)
              }}
            >
              {t('common.clearTable')}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
