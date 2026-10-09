import { create, type StoreApi, type UseBoundStore } from 'zustand'

export interface DataSet<Row> {
  name: string
  rows: Row[]
}

export interface DataSetState<Row> {
  sets: DataSet<Row>[]
  /** índice del conjunto seleccionado */
  selected: number
  /** fila seleccionada dentro del conjunto */
  selectedRow: number | null
  selectSet: (index: number) => void
  selectRow: (index: number | null) => void
  addSet: (name: string) => void
  deleteSet: (index: number) => void
  /** agrega una fila al conjunto indicado (por defecto, al seleccionado) */
  addRow: (row: Row, setIndex?: number) => void
  deleteRow: (index: number) => void
  clearRows: () => void
}

/**
 * Datos agrupados en conjuntos con nombre ("Data Sets" del original): cada conjunto tiene su
 * propia tabla. Se conservan al cambiar de experimento, como en el SWF.
 */
export function createDataSetStore<Row>(names: string[]): UseBoundStore<StoreApi<DataSetState<Row>>> {
  return create<DataSetState<Row>>()((set) => ({
    sets: names.map((name) => ({ name, rows: [] })),
    selected: 0,
    selectedRow: null,
    selectSet: (index) => set({ selected: index, selectedRow: null }),
    selectRow: (index) => set({ selectedRow: index }),
    addSet: (name) => set((s) => ({ sets: [...s.sets, { name, rows: [] }], selected: s.sets.length, selectedRow: null })),
    deleteSet: (index) =>
      set((s) => {
        const sets = s.sets.filter((_, i) => i !== index)
        return { sets, selected: Math.max(0, Math.min(s.selected, sets.length - 1)), selectedRow: null }
      }),
    addRow: (row, setIndex) =>
      set((s) => {
        const target = setIndex ?? s.selected
        if (!s.sets[target]) return s
        return {
          sets: s.sets.map((d, i) => (i === target ? { ...d, rows: [...d.rows, row] } : d)),
          selected: target,
          selectedRow: null
        }
      }),
    deleteRow: (index) =>
      set((s) => ({
        sets: s.sets.map((d, i) => (i === s.selected ? { ...d, rows: d.rows.filter((_, r) => r !== index) } : d)),
        selectedRow: null
      })),
    clearRows: () =>
      set((s) => ({
        sets: s.sets.map((d, i) => (i === s.selected ? { ...d, rows: [] } : d)),
        selectedRow: null
      }))
  }))
}
