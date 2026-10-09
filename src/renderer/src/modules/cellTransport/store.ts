import { create } from 'zustand'
import type { ExperimentId, SoluteId } from './model/constants'

/**
 * Una corrida registrada: una fila por soluto, con las celdas ya formateadas como en el
 * original (f_addDataSet), incluida la marca "#" de equilibrio no alcanzado.
 */
export interface RunRecord {
  setNum: number
  rows: Array<{ solute: SoluteId; cells: string[] }>
}

interface RunsState {
  runs: Record<ExperimentId, RunRecord[]>
  addRun: (exp: ExperimentId, rows: RunRecord['rows']) => void
  deleteRun: (exp: ExperimentId, setNum: number) => void
}

/** Datos de las corridas; se conservan al cambiar de experimento (a_DS del original) */
export const useRunsStore = create<RunsState>()((set) => ({
  runs: { sd: [], fd: [], os: [], fl: [], at: [] },
  addRun: (exp, rows) =>
    set((s) => {
      const list = s.runs[exp]
      const setNum = list.length === 0 ? 1 : list[list.length - 1].setNum + 1
      return { runs: { ...s.runs, [exp]: [...list, { setNum, rows }] } }
    }),
  deleteRun: (exp, setNum) =>
    set((s) => ({ runs: { ...s.runs, [exp]: s.runs[exp].filter((r) => r.setNum !== setNum) } }))
}))
