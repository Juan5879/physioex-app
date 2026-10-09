import { createExperimentStore } from '@/shared/lib/createExperimentStore'
import type { OddIdentity } from './model/serology'

export interface DfaRow {
  sample: string
  elementary: number
  chlamydia: boolean
}
export interface OddRow {
  wells: [number, number]
  identity: OddIdentity
}
export interface ElisaRow {
  sample: string
  od: number
}
export interface WbRow {
  sample: string
  bands: boolean[]
}

export const useDfaStore = createExperimentStore<object, DfaRow>({})
export const useOddStore = createExperimentStore<object, OddRow>({})
export const useElisaStore = createExperimentStore<object, ElisaRow>({})
export const useWbStore = createExperimentStore<object, WbRow>({})
