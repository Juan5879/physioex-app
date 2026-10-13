import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { create, type StoreApi, type UseBoundStore } from 'zustand'
import { EmptyTable, HeaderText } from './DataTable'
import { Button, Modal, Panel } from './ui'

/** Una corrida registrada: varias filas (p. ej. una por tubo) con celdas ya formateadas */
export interface Run {
  setNum: number
  rows: string[][]
}

export interface RunsState {
  runs: Run[]
  addRun: (rows: string[][]) => void
  deleteRun: (setNum: number) => void
}

/** Store de corridas numeradas; se conservan al cambiar de experimento */
export function createRunsStore(): UseBoundStore<StoreApi<RunsState>> {
  return create<RunsState>()((set) => ({
    runs: [],
    addRun: (rows) =>
      set((s) => ({ runs: [...s.runs, { setNum: (s.runs.at(-1)?.setNum ?? 0) + 1, rows }] })),
    deleteRun: (setNum) => set((s) => ({ runs: s.runs.filter((r) => r.setNum !== setNum) }))
  }))
}

/**
 * Lista de corridas ("Run Number") con "Registrar datos" y "Borrar corrida", y la tabla de la
 * corrida seleccionada (por defecto la última).
 */
export function RunTable({
  headers,
  runs,
  canRecord,
  onRecord,
  onDelete,
  extraButtons,
  footer,
  className = ''
}: {
  headers: string[]
  runs: Run[]
  canRecord: boolean
  onRecord: () => void
  onDelete: (setNum: number) => void
  extraButtons?: ReactNode
  /** nota bajo la tabla (p. ej. leyenda de símbolos) */
  footer?: ReactNode
  className?: string
}): ReactNode {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<number | null>(null)
  const [confirm, setConfirm] = useState(false)
  const shown = runs.find((r) => r.setNum === selected) ?? runs.at(-1) ?? null
  // columna numérica si todas sus celdas son números (con o sin unidad o signo)
  const numeric = headers.map((_, j) => (shown?.rows ?? []).every((r) => /^[-+]?\d/.test(r[j] ?? '')))

  return (
    <Panel
      title={t('common.results')}
      className={className}
      actions={
        <div className="px-panel__actions">
          {extraButtons}
          <Button
            size="sm"
            icon="plus"
            onClick={() => {
              onRecord()
              setSelected(null)
            }}
            disabled={!canRecord}
          >
            {t('common.recordData')}
          </Button>
          <Button size="sm" variant="danger" icon="trash" onClick={() => setConfirm(true)} disabled={!shown}>
            {t('common.deleteRun')}
          </Button>
        </div>
      }
    >
      <div className="px-results">
        <div className="px-results__side">
          <span className="px-label">{t('common.runs')}</span>
          <div className="px-setlist" role="listbox" aria-label={t('common.runs')}>
            {runs.map((r) => (
              <button
                key={r.setNum}
                type="button"
                role="option"
                aria-selected={shown?.setNum === r.setNum}
                onClick={() => setSelected(r.setNum)}
              >
                {t('common.run')} {r.setNum}
                <span className="c">{r.rows.length}</span>
              </button>
            ))}
            {runs.length === 0 && <div className="px-empty">{t('common.noRuns')}</div>}
          </div>
        </div>
        <div className="px-tablewrap px-tablewrap--scroll">
          <table className="px-table">
            <thead>
              <tr>
                {headers.map((h, j) => (
                  <th key={h} className={numeric[j] ? 'num' : undefined}>
                    <HeaderText>{h}</HeaderText>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown?.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((c, j) => (
                    <td key={j} className={numeric[j] ? 'num' : undefined}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {!shown && <EmptyTable />}
        </div>
      </div>
      {footer}
      {confirm && shown && (
        <Modal title={t('common.deleteRun')} onClose={() => setConfirm(false)}>
          <p className="px-modal__text">{t('common.confirmDeleteRun', { run: shown.setNum })}</p>
          <div className="px-modal__actions">
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                onDelete(shown.setNum)
                setSelected(null)
                setConfirm(false)
              }}
            >
              {t('common.deleteRun')}
            </Button>
          </div>
        </Modal>
      )}
    </Panel>
  )
}

/** Hoja impresa: una tabla por corrida */
export function PrintRuns({ headers, runs }: { headers: string[]; runs: Run[] }): ReactNode {
  const { t } = useTranslation()
  return (
    <div className="space-y-4">
      {runs.map((r) => (
        <div key={r.setNum}>
          <p className="mb-1 font-semibold">
            {t('common.run')} {r.setNum}
          </p>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {headers.map((h) => (
                  <th key={h} className="border border-black px-2 py-1">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {r.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((c, j) => (
                    <td key={j} className="border border-black px-2 py-1 text-center">
                      {c}
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
