import { K2, LATENT } from './constants'
import { activeScale, passiveForce, round2, voltageRecruitment, type TracePoint } from './common'

export const IT = {
  /** el original usa K1 = 4.96 en este experimento (4.955 en los demás) */
  K1: 4.96,
  K8: 0.05,
  /** escala de acortamiento (mm por unidad de fuerza sobrante relativa al peso) */
  H_SCALE: 11,
  P_MIN: 50,
  P_NOM: 75,
  P_MAX: 100,
  samples: 360,
  /** pesas disponibles (g) */
  weights: [0.5, 1, 1.5, 2]
} as const

/** Longitud a la que cada pesa estira el músculo sin soporte (tabla de f_muscleLength) */
const WEIGHT_LENGTH: Record<number, number> = { 0: 50, 0.5: 93.4, 1: 97, 1.5: 99.2, 2: 105 }

/** Longitud de reposo del músculo con una pesa, limitada por la altura de la plataforma */
export function isotonicLength(weight: number, platformHeight: number): number {
  return Math.min(WEIGHT_LENGTH[weight] ?? 50, platformHeight)
}

export interface IsotonicPoint extends TracePoint {
  /** acortamiento del músculo (mm) */
  shortening: number
}

export interface IsotonicResult {
  points: IsotonicPoint[]
  length: number
  passive: number
  activeMax: number
  totalMax: number
  /** velocidad máxima de acortamiento (mm/ms) */
  velocityMax: number
}

/** Simula una contracción isotónica (frame 50, clip PlaceObject2_874) */
export function simulateIsotonic(params: {
  voltage: number
  platformHeight: number
  weight: number
  tMax: number
}): IsotonicResult {
  const { voltage, platformHeight, weight, tMax } = params
  const length = isotonicLength(weight, platformHeight)
  const passive = passiveForce(length)
  const vrr = round2(voltageRecruitment(voltage))
  const scale = activeScale(length)
  const k2k1 = K2 * IT.K1
  const inc = tMax / IT.samples

  const points: IsotonicPoint[] = []
  let t = 0
  let deltaK2 = 0
  let lengthChange = 0
  let velocityMax = 0
  let activeMax = 0

  for (let pix = 0; pix < IT.samples; pix++) {
    const c = Math.max(0, t - LATENT)
    let fAct = k2k1 * c * Math.exp(-(K2 + deltaK2) * c) * vrr * scale
    let fTot = fAct + passive
    let fLift = 0
    if (weight < fTot) {
      // el músculo levanta la pesa: la tensión queda fija en el peso
      fLift = fTot - weight
      fTot = weight
      fAct = fTot - passive
    }
    const lengthChangeOld = lengthChange
    lengthChange = IT.H_SCALE * (fLift / weight)
    deltaK2 += IT.K8 * fLift * inc * K2
    const velocity = (lengthChange - lengthChangeOld) / inc
    if (velocityMax < velocity) velocityMax = velocity
    if (activeMax < fAct) activeMax = fAct
    points.push({ t, force: fAct + passive, shortening: lengthChange })
    t += inc
  }

  return { points, length, passive, activeMax, totalMax: activeMax + passive, velocityMax }
}
