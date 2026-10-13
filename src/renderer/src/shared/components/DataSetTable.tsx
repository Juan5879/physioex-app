import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { DataSetState } from '@/shared/lib/createDataSetStore'
import { ResultsTable, TableActions, type DataColumn } from './DataTable'
import { Button, Field, Modal, Panel } from './ui'

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
  label,
  className = ''
}: {
  store: DataSetState<Row>
  columns: DataColumn<Row>[]
  onRecord: () => void
  canRecord: boolean
  editable?: boolean
  /** rótulo de cada conjunto (por defecto su nombre) */
  label?: (name: string) => string
  className?: string
}): ReactNode {
  const { t } = useTranslation()
  const [adding, setAdding] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const current = store.sets[store.selected]
  const validName = adding !== null && /^[\p{L}\p{N} .]+$/u.test(adding.trim())

  return (
    <Panel
      title={t('common.results')}
      className={className}
      actions={
        <TableActions
          rows={current?.rows ?? []}
          selected={store.selectedRow}
          onRecord={onRecord}
          onDelete={store.deleteRow}
          onClear={store.clearRows}
          canRecord={canRecord && Boolean(current)}
        />
      }
    >
      <div className="px-results">
        <div className="px-results__side">
          <span className="px-label">{t('common.dataSets')}</span>
          <div className="px-setlist" role="listbox" aria-label={t('common.dataSets')}>
            {store.sets.map((d, i) => (
              <button
                key={`${d.name}-${i}`}
                type="button"
                role="option"
                aria-selected={i === store.selected}
                onClick={() => store.selectSet(i)}
              >
                <span className="truncate">{label ? label(d.name) : d.name}</span>
                <span className="c">{d.rows.length}</span>
              </button>
            ))}
          </div>
          {editable && (
            <>
              <Button size="sm" block icon="plus" onClick={() => setAdding('')}>
                {t('common.addDataSet')}
              </Button>
              <Button size="sm" block onClick={() => setConfirmDelete(true)} disabled={!current}>
                {t('common.deleteDataSet')}
              </Button>
            </>
          )}
        </div>
        <ResultsTable
          columns={columns}
          rows={current?.rows ?? []}
          selected={store.selectedRow}
          onSelect={store.selectRow}
        />
      </div>

      {adding !== null && (
        <Modal title={t('common.addDataSet')} onClose={() => setAdding(null)}>
          <Field label={t('common.dataSetName')}>
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
            className="px-input"
          />
          </Field>
          <div className="px-modal__actions">
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
          <p className="px-modal__text">{t('common.confirmDeleteDataSet', { name: current.name })}</p>
          <div className="px-modal__actions">
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
    </Panel>
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
