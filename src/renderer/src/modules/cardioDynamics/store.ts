import { createDataSetStore } from '@/shared/lib/createDataSetStore'

export interface VesselRow {
  flow: number
  radius: number
  viscosity: number
  length: number
  pressure: number
}

export interface PumpRow {
  flow: number
  radiusL: number
  radiusR: number
  strokeVolume: number
  rate: number
  pressureL: number
  /** presión de la bomba − presión del vaso derecho */
  pressureDif: number
}

/** conjuntos iniciales del original (dataSetNames) */
export const useVesselSets = createDataSetStore<VesselRow>(['Radius', 'Viscosity', 'Length', 'Pressure'])
export const usePumpSets = createDataSetStore<PumpRow>(['Rad.R.', 'Str.V.'])
