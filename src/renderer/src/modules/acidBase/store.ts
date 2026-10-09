import { createExperimentStore } from '@/shared/lib/createExperimentStore'
import { createDataSetStore } from '@/shared/lib/createDataSetStore'
import type { Level, MetabolicResult, RespCondition } from './model/acidBase'

export interface RespRow {
  condition: RespCondition
  minPco2: number
  maxPco2: number
  minPh: number
  maxPh: number
}

export interface RenalRow {
  pco2: number
  ph: number
  h: Level
  hco3: Level
}

export const useRespStore = createExperimentStore<object, RespRow>({})
export const useMetabolicStore = createExperimentStore<{ index: number }, MetabolicResult>({ index: 6 })
export const useRenalSets = createDataSetStore<RenalRow>(['PCO2'])
