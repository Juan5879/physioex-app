import { create } from 'zustand'
import { createDataSetStore } from '@/shared/lib/createDataSetStore'
import type { Hormone } from './model/endocrine'

export interface MetabolismRow {
  weight: number
  /** segundos */
  elapsed: number
  o2: number
  hormone: Hormone
}

export interface HrtRow {
  days: number
  saline: number
  estrogen: number
  weight: number
}

export interface TubeRow {
  tube: number
  opticalDensity: number
  glucose: number
}

export interface DiabetesRow extends TubeRow {
  insulin: boolean
  saline: boolean
  alloxan: boolean
}

/** un conjunto por rata (dataSetM / dataSetHRT) */
export const useMetabolismSets = createDataSetStore<MetabolismRow>(['normal', 'tx', 'hypox'])
export const useHrtSets = createDataSetStore<HrtRow>(['control', 'experimental'])

interface TubeTableState<R> {
  rows: R[]
  /** el original guardaba cada tubo en su posición: registrar de nuevo lo reemplaza */
  setRow: (row: R & { tube: number }) => void
  clear: () => void
}

/** Parte 1: una fila por tubo de la curva patrón (dataListID) */
export const useStandardTable = create<TubeTableState<TubeRow>>()((set) => ({
  rows: [],
  setRow: (row) => set((s) => ({ rows: [...s.rows.filter((r) => r.tube !== row.tube), row].sort((a, b) => a.tube - b.tube) })),
  clear: () => set({ rows: [] })
}))

interface DiabetesRuns {
  /** una corrida por cada vez que se entra al experimento (dataListID2) */
  runs: DiabetesRow[][]
  startRun: () => number
  setRow: (run: number, row: DiabetesRow) => void
}

export const useDiabetesRuns = create<DiabetesRuns>()((set, get) => ({
  runs: [],
  startRun: () => {
    const runs = get().runs
    // como el original, no se abre una corrida nueva si la última quedó vacía
    if (runs.length > 0 && runs[runs.length - 1].length === 0) return runs.length - 1
    set({ runs: [...runs, []] })
    return runs.length
  },
  setRow: (run, row) =>
    set((s) => ({
      runs: s.runs.map((r, i) =>
        i === run ? [...r.filter((x) => x.tube !== row.tube), row].sort((a, b) => a.tube - b.tube) : r
      )
    }))
}))
