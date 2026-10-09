import { createExperimentStore } from '@/shared/lib/createExperimentStore'
import type { BreathCondition } from './model/respiratory'

export interface VolumesRow {
  radius: number
  flow: number
  tidal: number | null
  expReserve: number | null
  inspReserve: number | null
  residual: number | null
  vitalCapacity: number | null
  fev1: number | null
  totalLungCapacity: number | null
  pumpRate: number | null
}

export interface FactorsRow {
  radius: number
  pumpRate: number
  surfactant: number
  pressureL: number
  pressureR: number
  flowL: number
  flowR: number
  totalFlow: number
}

export interface BreathingRow {
  condition: BreathCondition
  pco2: number
  maxPco2: number
  minPco2: number
  pumpRate: number
  radius: number
  totalFlow: number
}

export const useVolumesStore = createExperimentStore<{ radius: number }, VolumesRow>({ radius: 5 })
export const useFactorsStore = createExperimentStore<{ radius: number; pumpRate: number }, FactorsRow>({
  radius: 5,
  pumpRate: 15
})
export const useBreathingStore = createExperimentStore<{ radius: number }, BreathingRow>({ radius: 5 })
