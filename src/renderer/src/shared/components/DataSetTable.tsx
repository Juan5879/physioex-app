import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { DataSetState } from '@/shared/lib/createDataSetStore'
import { DataTable, type DataColumn } from './DataTable'
import { Button, Modal } from './ui'

/**
 * Lista de conjuntos de datos con su tabla. Con `editable` se pueden agregar conjuntos
 * con nombre y borrarlos ("Add Data Set" / "Delete Data Set" del original).
 */
export function DataSetTable<Row>({
  store,
  columns,
  onRecord,
  canRecord,
  editable = false,
  label
}: {
  store: DataSetState<Row>
  columns: DataColumn<Row>[]
  onRecord: () => void
  canRecord: boolean
  editable?: boolean
  /** rótulo de cada conjunto (por defecto su nombre) */
  label?: (name: string) => string
}): ReactNode {
  const { t } = useTranslation()
  const [adding, setAdding] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const current = store.sets[store.selected]
  const validName = adding !== null && /^[\p{L}\p{N} .]+$/u.test(adding.trim())

  return (
    <div className="flex gap-3">
      <div className="flex w-36 shrink-0 flex-col gap-1.5">
        <span className="text-center text-sm font-semibold text-bench-100">{t('common.dataSets')}</span>
        <div className="h-28 overflow-y-auto rounded border border-black bg-black font-mono text-sm text-lcd">
          {store.sets.map((d, i) => (
            <button
              key={`${d.name}-${i}`}
              type="button"
              onClick={() => store.selectSet(i)}
              className={`block w-full truncate px-2 py-0.5 text-left ${i === store.selected ? 'bg-sky-700 text-white' : 'hover:bg-bench-800'}`}
            >
              {label ? label(d.name) : d.name}
            </button>
          ))}
        </div>
        {editable && (
          <>
            <Button onClick={() => setAdding('')}>{t('common.addDataSet')}</Button>
            <Button onClick={() => setConfirmDelete(true)} disabled={!current}>
              {t('common.deleteDataSet')}
            </Button>
          </>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <DataTable
          columns={columns}
          rows={current?.rows ?? []}
          selected={store.selectedRow}
          onSelect={store.selectRow}
          onRecord={onRecord}
          onDelete={store.deleteRow}
          onClear={store.clearRows}
          canRecord={canRecord && Boolean(current)}
        />
      </div>

      {adding !== null && (
        <Modal title={t('common.addDataSet')} onClose={() => setAdding(null)}>
          <label className="mb-1 block text-sm text-bench-100">{t('common.dataSetName')}</label>
          <input
            autoFocus
            value={adding}
            maxLength={12}
            onChange={(e) => setAdding(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && validName) {
                store.addSet(adding.trim())
                setAdding(null)
              }
            }}
            className="w-full rounded border border-bench-300 bg-white px-3 py-2 text-black select-text"
          />
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAdding(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              disabled={!validName}
              onClick={() => {
                store.addSet(adding.trim())
                setAdding(null)
              }}
            >
              {t('common.ok')}
            </Button>
          </div>
        </Modal>
      )}
      {confirmDelete && current && (
        <Modal title={t('common.deleteDataSet')} onClose={() => setConfirmDelete(false)}>
          <p className="mb-5 text-bench-100">{t('common.confirmDeleteDataSet', { name: current.name })}</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                store.deleteSet(store.selected)
                setConfirmDelete(false)
              }}
            >
              {t('common.deleteDataSet')}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}

/** Hoja impresa: una tabla por conjunto de datos */
export function PrintDataSets<Row>({
  sets,
  columns,
  label
}: {
  sets: { name: string; rows: Row[] }[]
  columns: DataColumn<Row>[]
  label?: (name: string) => string
}): ReactNode {
  return (
    <div className="space-y-4">
      {sets
        .filter((d) => d.rows.length > 0)
        .map((d, i) => (
          <div key={`${d.name}-${i}`}>
            <p className="mb-1 font-semibold">{label ? label(d.name) : d.name}</p>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c.key} className="border border-black px-2 py-1">
                      {c.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.rows.map((r, j) => (
                  <tr key={j}>
                    {columns.map((c) => (
                      <td key={c.key} className="border border-black px-2 py-1 text-center">
                        {c.format(r)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </div>
  )
}
