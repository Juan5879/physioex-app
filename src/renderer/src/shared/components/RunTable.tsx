import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { create, type StoreApi, type UseBoundStore } from 'zustand'
import { Button, Modal } from './ui'

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
  extraButtons
}: {
  headers: string[]
  runs: Run[]
  canRecord: boolean
  onRecord: () => void
  onDelete: (setNum: number) => void
  extraButtons?: ReactNode
}): ReactNode {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<number | null>(null)
  const [confirm, setConfirm] = useState(false)
  const shown = runs.find((r) => r.setNum === selected) ?? runs.at(-1) ?? null

  return (
    <div className="flex gap-3">
      <div className="flex w-20 shrink-0 flex-col">
        <span className="mb-1 text-center text-sm font-semibold text-bench-100">{t('common.run')}</span>
        <div className="h-36 overflow-y-auto rounded border border-black bg-black font-mono text-lcd">
          {runs.map((r) => (
            <button
              key={r.setNum}
              type="button"
              onClick={() => setSelected(r.setNum)}
              className={`block w-full px-2 py-0.5 text-center ${shown?.setNum === r.setNum ? 'bg-sky-700 text-white' : 'hover:bg-bench-800'}`}
            >
              {r.setNum}
            </button>
          ))}
        </div>
      </div>
      <div className="flex w-36 shrink-0 flex-col justify-center gap-1.5">
        <Button
          onClick={() => {
            onRecord()
            setSelected(null)
          }}
          disabled={!canRecord}
        >
          {t('common.recordData')}
        </Button>
        <Button onClick={() => setConfirm(true)} disabled={!shown}>
          {t('common.deleteRun')}
        </Button>
        {extraButtons}
      </div>
      <div className="h-44 min-w-0 flex-1 overflow-auto rounded border border-black bg-black">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-bench-600">
            <tr>
              {headers.map((h) => (
                <th key={h} className="px-2 py-1 text-center font-semibold whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="font-mono text-lcd">
            {shown?.rows.map((row, i) => (
              <tr key={i} className="border-t border-bench-700">
                {row.map((c, j) => (
                  <td key={j} className="px-2 py-1 text-center whitespace-nowrap">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!shown && <p className="p-3 text-center text-sm text-bench-300">{t('common.noData')}</p>}
      </div>
      {confirm && shown && (
        <Modal title={t('common.deleteRun')} onClose={() => setConfirm(false)}>
          <p className="mb-5 text-bench-100">{t('common.confirmDeleteRun', { run: shown.setNum })}</p>
          <div className="flex justify-end gap-2">
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
    </div>
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
