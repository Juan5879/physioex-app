import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Modal, Panel } from './ui'

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
  className?: string
}

/**
 * Panel «Resultados»: tabla con «Registrar datos», «Borrar línea» y «Limpiar tabla» en el
 * encabezado. El original mostraba 4 filas con flechas de desplazamiento; aquí la tabla hace scroll.
 */
export function DataTable<Row>({ className = '', ...props }: DataTableProps<Row>): ReactNode {
  const { t } = useTranslation()
  return (
    <Panel title={t('common.results')} actions={<TableActions {...props} />} className={className}>
      <ResultsTable {...props} />
    </Panel>
  )
}

/** Botones del encabezado de Resultados (con confirmación para limpiar la tabla) */
export function TableActions<Row>({
  rows,
  selected,
  onRecord,
  onDelete,
  onClear,
  canRecord,
  children
}: Pick<DataTableProps<Row>, 'rows' | 'selected' | 'onRecord' | 'onDelete' | 'onClear' | 'canRecord'> & {
  children?: ReactNode
}): ReactNode {
  const { t } = useTranslation()
  const [confirmClear, setConfirmClear] = useState(false)
  return (
    <div className="px-panel__actions">
      {children}
      <Button size="sm" icon="plus" onClick={onRecord} disabled={!canRecord}>
        {t('common.recordData')}
      </Button>
      <Button size="sm" onClick={() => selected !== null && onDelete(selected)} disabled={selected === null}>
        {t('common.deleteLine')}
      </Button>
      <Button size="sm" variant="danger" icon="trash" onClick={() => setConfirmClear(true)} disabled={rows.length === 0}>
        {t('common.clearTable')}
      </Button>

      {confirmClear && (
        <Modal title={t('common.clearTable')} onClose={() => setConfirmClear(false)}>
          <p className="px-modal__text">{t('common.confirmClearTable')}</p>
          <div className="px-modal__actions">
            <Button variant="ghost" onClick={() => setConfirmClear(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              icon="trash"
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

/** Tabla `.px-table` con selección de fila; las columnas numéricas se alinean a la derecha */
export function ResultsTable<Row>({
  columns,
  rows,
  selected,
  onSelect
}: Pick<DataTableProps<Row>, 'columns' | 'rows' | 'selected' | 'onSelect'>): ReactNode {
  const numeric = columns.map((c) => rows.every((r) => Number.isFinite(c.value(r))))
  return (
    <div className="px-tablewrap px-tablewrap--scroll">
      <table className="px-table">
        <thead>
          <tr>
            {columns.map((c, j) => (
              <th key={c.key} className={numeric[j] ? 'num' : undefined}>
                <HeaderText>{c.header}</HeaderText>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              onClick={() => onSelect(selected === i ? null : i)}
              className={`is-clickable ${selected === i ? 'is-selected' : ''}`}
            >
              {columns.map((c, j) => (
                <td key={c.key} className={numeric[j] ? 'num' : undefined}>
                  {c.format(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <EmptyTable />}
    </div>
  )
}

/** Separa la unidad final de un encabezado («Fuerza activa (g)») para mostrarla sin mayúsculas */
export function HeaderText({ children }: { children: ReactNode }): ReactNode {
  if (typeof children !== 'string') return children
  const m = /^(.*\S)\s*(\([^()]+\))$/.exec(children)
  if (!m) return children
  return (
    <>
      {m[1]} <span className="u">{m[2]}</span>
    </>
  )
}

export function EmptyTable(): ReactNode {
  const { t } = useTranslation()
  return (
    <div className="px-empty">
      <b>{t('common.emptyTitle')}</b>
      {t('common.emptyHint')}
    </div>
  )
}
