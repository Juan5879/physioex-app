/** Modelo de 07_RenalSys.swf (frame_5: filtración glomerular; frame_15: formación de orina) */

// ---------- Experimento 1: filtración glomerular ----------

export const GF = {
  afferent: { min: 0.1, max: 0.6, step: 0.01, initial: 0.5 },
  efferent: { min: 0.1, max: 0.6, step: 0.01, initial: 0.45 },
  pressure: { min: 70, max: 100, step: 1, initial: 90 }
} as const

export interface FiltrationResult {
  /** presión glomerular (mm Hg) */
  glomerularPressure: number
  /** tasa de filtración glomerular (ml/min) */
  gfr: number
  /** volumen de orina (ml) */
  urineVolume: number
  /** flujo por la arteriola aferente: da la duración de la corrida */
  afferentFlow: number
}

/**
 * f_initCalcs: el glomérulo se modela como un nodo entre la arteriola aferente (conductancia
 * K1·r⁴), la eferente (K3·r⁴) y la cápsula (K2), con P3 = 16 y P4 = 45 mm Hg.
 */
export function glomerularFiltration(afferent: number, efferent: number, pressure: number, valveOpen: boolean): FiltrationResult {
  const P3 = 16
  const P4 = 45
  const K1 = 5
  const K2 = 12.4
  const K3 = 1.935
  const a = afferent / 0.5
  const e = efferent / 0.5
  const v1 = K1 * Math.pow(a, 4)
  const v2 = K3 * Math.pow(e, 4)
  const capsular = (P3 * v2 + pressure * v1 + K2 * P4) / (v2 + v1 + K2)
  const afferentFlow = K1 * (pressure - capsular) * Math.pow(a, 4)
  const efferentFlow = K3 * (capsular - P3) * Math.pow(e, 4)
  let gfr = Math.max(0, afferentFlow - efferentFlow)
  if (!valveOpen) gfr = 0
  const urineFlow = (10 * gfr) / 125
  const duration = 3500 / afferentFlow
  return { glomerularPressure: capsular, gfr, urineVolume: urineFlow * duration, afferentFlow }
}

/** frames de vaciado del vaso (timeFactor·flowDuration·framerate) */
export const drainFrames = (afferentFlow: number): number => 0.2 * (3500 / afferentFlow) * 12

// ---------- Experimento 2: formación de orina ----------

export const UF = {
  carriers: { min: 0, max: 500, step: 50, initial: 0 },
  gradient: { min: 300, max: 3000, step: 100, initial: 300 }
} as const

export interface UrineResult {
  glucose: number
  potassium: number
  urineVolume: number
}

/** f_startCalcs */
export function urineFormation(p: {
  carriers: number
  gradient: number
  adh: boolean
  aldosterone: boolean
  valveOpen: boolean
}): UrineResult & { urineFlow: number } {
  const maxCar = 350
  const glucose = p.carriers <= maxCar ? 6 * (1 - p.carriers / maxCar) : 0
  const potLoad = p.aldosterone ? 0.0938 : 0.0625
  const totSol = 1.14 + potLoad
  const urineFlow = p.adh ? totSol / p.gradient : p.aldosterone ? 0.009 : 0.01
  const potassium = potLoad / urineFlow
  const urineVolume = p.valveOpen ? urineFlow * 20100 : 0
  return { glucose, potassium, urineVolume, urineFlow }
}

/**
 * Concentración de la orina: el original sólo la actualizaba en estos casos y si no conservaba
 * el valor anterior (`null` = sin cambio).
 */
export function urineConcentration(adh: boolean, urineVolume: number, gradient: number): number | null {
  if (adh && urineVolume > 2) return gradient
  if (!adh && urineVolume > 10) return 100
  return null
}

/** Segmentos del túbulo donde se puede medir con la sonda (f_nextDrag) */
export type Segment = 'descending' | 'ascending' | 'distal' | 'collecting' | 'loop' | 'urine'

/**
 * Concentración (mosm) en un segmento. `pos` es la profundidad (0 = corteza, 1 = médula)
 * o, en el fondo del asa, la posición hacia la derecha.
 */
export function segmentConcentration(segment: Segment, pos: number, gradient: number, adhWasPresent: boolean, urineConc: number): number {
  switch (segment) {
    case 'descending':
      return 300 + (gradient - 300) * pos
    case 'ascending':
      return 100 + (gradient - 300) * pos
    case 'collecting':
      return adhWasPresent ? 300 + (gradient - 300) * pos : 100
    case 'distal':
      return 100
    case 'loop':
      return gradient - 200 * pos
    case 'urine':
      return urineConc
  }
}
