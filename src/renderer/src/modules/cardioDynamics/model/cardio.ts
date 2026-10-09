/** Modelo de 03_CardioDynam.swf (frame_5: resistencia vascular, frame_15: mecánica de la bomba) */

/** Controles de la resistencia vascular (mínimo, inicial, máximo, paso) */
export const VR = {
  pressure: { min: 0, max: 225, step: 1, initial: 100 },
  radius: { min: 1, max: 6, step: 0.1, initial: 3 },
  viscosity: { min: 0.1, max: 10, step: 0.1, initial: 3.5 },
  length: { min: 10, max: 50, step: 5, initial: 50 }
} as const

/** Conversión del flujo a píxeles por frame de la animación (vrConv) */
export const VR_CONV = 13.5
/** altura del líquido en el vaso (px) */
export const BEAKER_PX = 150
/** px de tubo por mm de longitud */
export const TUBE_PX_PER_MM = 6.9

export type VesselAlert = 'insufficientDrive' | 'lowFlow'

/** Ley de Poiseuille (f_doVRFlowCalc): flujo = π·r⁴·ΔP / (8·L·η), en ml/min */
export function vesselFlow(p: { pressure: number; radius: number; viscosity: number; length: number }): {
  flow: number
  alert?: VesselAlert
} {
  if (!(p.pressure > 0)) return { flow: 0, alert: 'insufficientDrive' }
  const flow = (3.14 * Math.pow(p.radius, 4) * p.pressure) / (8 * p.length * p.viscosity)
  if (flow < 0.1) return { flow: 0, alert: 'lowFlow' }
  return { flow }
}

/**
 * Frames que dura la animación de la corrida (f_vrFlowAnimNext): el tubo se llena, el vaso
 * izquierdo pasa al derecho y el tubo se vacía.
 */
export function vesselAnimationFrames(flow: number, length: number): number {
  const incrB = flow / VR_CONV
  const incrT = (flow * 60) / VR_CONV
  const tubePx = length * TUBE_PX_PER_MM
  return Math.ceil(tubePx / incrT) * 2 + Math.ceil(BEAKER_PX / incrB)
}

/** Controles de la bomba */
export const PM = {
  pressureL: { min: 0, max: 225, step: 1, initial: 40 },
  pressurePump: { min: 0, max: 225, step: 1, initial: 120 },
  pressureR: { min: 0, max: 225, step: 1, initial: 80 },
  strokes: { min: 5, max: 20, step: 1, initial: 10 },
  radius: { min: 1, max: 6, step: 0.1, initial: 3 },
  volumeStart: { max: 120, initial: 120 },
  volumeEnd: { min: 0, initial: 50 }
} as const

/** volumen de cada vaso (ml) */
export const PM_BEAKER = 5000
/** ml por píxel de la animación del émbolo (pmConv) */
export const PM_CONV = 375
/** recorrido del émbolo: 144 px para 120 ml */
export const plungerPx = (volume: number): number => (144 * volume) / 120

export type PumpAlert = 'insufficientFluid' | 'noSourcePressure' | 'lowInflow' | 'lowOutflow' | 'rateTooHigh'

export interface PumpInput {
  /** ml en el vaso izquierdo */
  volumeL: number
  strokes: number
  strokeVolume: number
  pressureL: number
  pressurePump: number
  pressureR: number
  radiusL: number
  radiusR: number
}

export interface PumpResult {
  /** flujo (ml/min) */
  flow: number
  /** frecuencia (golpes/min) */
  rate: number
  /** flujo de llenado y de vaciado: dan la velocidad del émbolo */
  flowL: number
  flowR: number
}

/** f_doPMFlowCalc: la bomba se llena desde la izquierda y se vacía hacia la derecha */
export function pumpCalc(p: PumpInput): PumpResult | { alert: PumpAlert } {
  if (p.volumeL < p.strokes * p.strokeVolume) return { alert: 'insufficientFluid' }
  if (p.pressureL <= 0) return { alert: 'noSourcePressure' }
  const flowL = Math.pow(p.radiusL, 4) * p.pressureL * 3.14
  if (flowL < 0.1) return { alert: 'lowInflow' }
  const dif = p.pressurePump - p.pressureR
  if (dif <= 0) return { alert: 'lowOutflow' }
  const flowR = Math.pow(p.radiusR, 4) * dif * 3.14
  if (flowR < 0.1) return { alert: 'lowOutflow' }
  if (p.strokeVolume <= 0) return { flow: 0, rate: 0, flowL, flowR }
  const rate = (flowL * flowR) / (p.strokeVolume * (flowL + flowR))
  if (rate > 999) return { alert: 'rateTooHigh' }
  return { flow: rate * p.strokeVolume, rate, flowL, flowR }
}

export const round1 = (v: number): number => Math.round(v * 10) / 10
