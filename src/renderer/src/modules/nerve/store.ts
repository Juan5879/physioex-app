import { createExperimentStore } from '@/shared/lib/createExperimentStore'
import type { NerveId } from './model/nerve'

/** Tipo de estímulo que generó el último trazo del experimento 1 */
export type EniStimulus = 'elec' | 'NaCl' | 'HCl' | 'Glas' | 'Heat'
export type Inhibitor = 'Ethr' | 'Cura' | 'Lido'

export interface EniRow {
  stimulus: EniStimulus
  voltage: number
  actionPotential: boolean
}

export interface IniRow {
  voltage: number
  inhibitor: Inhibitor | null
  actionPotential: boolean
}

export interface NcvRow {
  nerve: NerveId
  /** tiempo medido hasta el potencial de acción (ms) */
  time: number
}

export const useEniStore = createExperimentStore<
  { voltage: number; stimRate: number; scale: 'msec' | 'sec' },
  EniRow
>({ voltage: 0, stimRate: 1, scale: 'msec' })

export const useIniStore = createExperimentStore<
  { voltage: number; interval: number; scale: 'msec' | 'min' },
  IniRow
>({ voltage: 0, interval: 0, scale: 'msec' })

export const useNcvStore = createExperimentStore<{ voltage: number }, NcvRow>({ voltage: 0 })
