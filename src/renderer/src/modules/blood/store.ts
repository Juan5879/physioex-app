import { createExperimentStore } from '@/shared/lib/createExperimentStore'
import type { Serum } from './model/blood'

export interface HctRow {
  sample: number
  total: number
  rbc: number
  buffy: number
}
export interface EsrRow {
  sample: number
  distance: number
  minutes: number
}
export interface HbRow {
  sample: number
  reading: number
}
export interface TypeRow {
  sample: number
  agglutination: Record<Serum, boolean>
}
export interface CholRow {
  patient: number
  value: number
  level: 'desirable' | 'borderline' | 'elevated' | 'na'
}

export const useHctStore = createExperimentStore<object, HctRow>({})
export const useEsrStore = createExperimentStore<object, EsrRow>({})
export const useHbStore = createExperimentStore<object, HbRow>({})
export const useTypeStore = createExperimentStore<object, TypeRow>({})
export const useCholStore = createExperimentStore<object, CholRow>({})
