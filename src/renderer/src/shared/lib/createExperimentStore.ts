import { create, type StoreApi, type UseBoundStore } from 'zustand'
import type { ScopeSeries } from '@/shared/components/Oscilloscope'

/** Colores que alternan entre trazos sucesivos (graphColor del original) */
export const TRACE_COLORS = ['#ffe14d', '#4dd2ff'] as const

export interface ExperimentState<Params, Row> {
  params: Params
  rows: Row[]
  selected: number | null
  traces: ScopeSeries[]
  traceCount: number
  setParams: (patch: Partial<Params> | ((p: Params) => Partial<Params>)) => void
  addRow: (row: Row) => void
  deleteRow: (index: number) => void
  clearRows: () => void
  select: (index: number | null) => void
  /** agrega un trazo nuevo y devuelve su id */
  addTrace: (points?: ScopeSeries['points']) => number
  /** reemplaza los puntos de un trazo existente (animación) */
  updateTrace: (id: number, points: ScopeSeries['points']) => void
  clearTraces: () => void
}

/**
 * Crea el store de un experimento: parámetros del aparato, tabla de datos y trazos
 * del osciloscopio. Los datos viven en memoria mientras la app esté abierta, igual que
 * en el original (se conservaban al cambiar de experimento).
 */
export function createExperimentStore<Params extends object, Row>(
  initialParams: Params
): UseBoundStore<StoreApi<ExperimentState<Params, Row>>> {
  return create<ExperimentState<Params, Row>>()((set, get) => ({
    params: initialParams,
    rows: [],
    selected: null,
    traces: [],
    traceCount: 0,
    setParams: (patch) =>
      set((s) => ({ params: { ...s.params, ...(typeof patch === 'function' ? patch(s.params) : patch) } })),
    addRow: (row) => set((s) => ({ rows: [...s.rows, row], selected: null })),
    deleteRow: (index) => set((s) => ({ rows: s.rows.filter((_, i) => i !== index), selected: null })),
    clearRows: () => set({ rows: [], selected: null }),
    select: (index) => set({ selected: index }),
    addTrace: (points = []) => {
      const id = get().traceCount + 1
      set((s) => ({
        traceCount: id,
        traces: [...s.traces, { id, color: TRACE_COLORS[id % 2], points }]
      }))
      return id
    },
    updateTrace: (id, points) =>
      set((s) => ({ traces: s.traces.map((t) => (t.id === id ? { ...t, points } : t)) })),
    clearTraces: () => set({ traces: [], traceCount: 0 })
  }))
}
