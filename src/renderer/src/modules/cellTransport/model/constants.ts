/** Constantes de 01_CellTran.swf (makeArrays en frame_2/DoAction_2.as) */

export type SoluteId = 'NaCl' | 'Urea' | 'Albu' | 'Gluc' | 'Napl' | 'Kplu' | 'PoCh'
export type ExperimentId = 'sd' | 'fd' | 'os' | 'fl' | 'at'
/** experimentos con dos vasos y membrana entre ellos */
export type BeakerExperiment = Exclude<ExperimentId, 'fl'>

export interface SoluteInfo {
  /** coeficiente de difusión (mM/min por mM de diferencia) */
  difCo: number
  /** poro mínimo (MWCO) por el que pasa */
  minMWCO: number
}

export const SOLUTES: Record<SoluteId, SoluteInfo> = {
  NaCl: { difCo: 0.01, minMWCO: 50 },
  Urea: { difCo: 0.006305, minMWCO: 100 },
  Albu: { difCo: 0, minMWCO: 500 },
  Gluc: { difCo: 0.0026395, minMWCO: 200 },
  Napl: { difCo: 0.01, minMWCO: 50 },
  // el original no definía minMWCO para K+ ni para el carbón (sólo se usan con transportadores)
  Kplu: { difCo: 0.00809, minMWCO: Infinity },
  PoCh: { difCo: 0, minMWCO: Infinity }
}

/** solutos de cada experimento, en el orden de la tabla (a_solutes_*) */
export const EXPERIMENT_SOLUTES: Record<ExperimentId, SoluteId[]> = {
  sd: ['NaCl', 'Urea', 'Albu', 'Gluc'],
  fd: ['NaCl', 'Gluc'],
  os: ['NaCl', 'Albu', 'Gluc'],
  fl: ['NaCl', 'Urea', 'Gluc', 'PoCh'],
  at: ['Napl', 'Kplu', 'Gluc']
}

/** membranas de diálisis disponibles */
export const MWCO = [20, 50, 100, 200] as const

/** minutos simulados por paso de cálculo (etime) */
export const ETIME = 30

/** el reloj avanza 1 minuto cada 10 frames a 20 fps */
export const FRAMES_PER_MINUTE = 10

/** rangos de los controles (onClipEvent(load) de cada botón) */
export const CONC = { min: 0, max: 20, step: 1 }
export const TIMER = { min: 5, max: 300, step: 5, initial: 60 }
export const CARRIERS = { min: 0, max: 1000, step: 50, initial: 500 }
export const ATP = { min: 0, max: 20, step: 1 }
export const PRESSURE = { min: 0, max: 100, step: 5, initial: 50 }

/** fracción de cada soluto que atraviesa el filtro (f_startFiltration) */
export const FILTER_THROUGH: Record<SoluteId, number> = {
  NaCl: 0.962,
  Urea: 0.948,
  Gluc: 0.879,
  PoCh: 0,
  Albu: 0,
  Napl: 0,
  Kplu: 0
}

export const round4 = (v: number): number => Math.round(v * 10000) / 10000
export const round3 = (v: number): number => Math.round(v * 1000) / 1000
