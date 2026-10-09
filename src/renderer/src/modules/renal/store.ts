import { createDataSetStore } from '@/shared/lib/createDataSetStore'

export interface FiltrationRow {
  afferent: number
  efferent: number
  pressure: number
  glomerularPressure: number
  gfr: number
  urineVolume: number
}

export interface UrineRow {
  glucose: number
  potassium: number
  urineVolume: number
  urineConc: number
  gradient: number
  aldosterone: boolean
  adh: boolean
}

export const useFiltrationSets = createDataSetStore<FiltrationRow>(['Afferent', 'Pressure', 'Combined'])
export const useUrineSets = createDataSetStore<UrineRow>(['Gradient', 'Glucose', 'Hormone'])
