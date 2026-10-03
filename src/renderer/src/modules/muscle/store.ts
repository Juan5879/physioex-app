import { createExperimentStore } from '@/shared/lib/createExperimentStore'
import { L_NOM, TIME_SCALES } from './model/constants'
import { MS } from './model/multipleStimulus'
import { IT } from './model/isotonic'

export interface ForceRow {
  voltage: number
  length: number
  active: number
  passive: number
  total: number
}

export interface MultipleRow extends ForceRow {
  rate: number
}

export interface IsotonicRow extends ForceRow {
  weight: number
  velocity: number
}

/** Punto de la gráfica longitud–tensión de la contracción isométrica */
export interface LengthTensionPoint {
  length: number
  active: number
  passive: number
  total: number
}

export const useSingleStore = createExperimentStore<
  { voltage: number; length: number; tMax: number },
  ForceRow
>({ voltage: 0, length: L_NOM, tMax: TIME_SCALES[0] })

export const useMultipleStore = createExperimentStore<
  { voltage: number; length: number; tMax: number; rate: number },
  MultipleRow
>({ voltage: MS.nomVoltage, length: L_NOM, tMax: TIME_SCALES[0], rate: 50 })

export const useIsometricStore = createExperimentStore<
  { voltage: number; length: number; plot: LengthTensionPoint[] },
  ForceRow
>({ voltage: 8.2, length: L_NOM, plot: [] })

export const useIsotonicStore = createExperimentStore<
  { voltage: number; platform: number; weight: number; tMax: number },
  IsotonicRow
>({ voltage: 8.2, platform: IT.P_NOM, weight: 0, tMax: TIME_SCALES[0] })
