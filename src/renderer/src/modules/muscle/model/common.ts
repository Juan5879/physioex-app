import { K3, K4, K5, K7, L_MAX, L_NOM, THRESHOLD, V_MAX } from './constants'

/** Redondea a 2 decimales como `Math.round(x * 100) / 100` del original */
export const round2 = (x: number): number => Math.round(x * 100) / 100

/**
 * Fuerza pasiva (g) a una longitud dada (mm).
 * AS1: F_pass = floor(K4 * exp(-(Lmax - L)/K5) * max(0, L - Lnom)/(Lmax - Lnom) * 100) / 100
 */
export function passiveForce(length: number): number {
  const temp1 = Math.exp(-(L_MAX - length) / K5)
  const temp2 = Math.max(0, length - L_NOM) / (L_MAX - L_NOM)
  return Math.max(0, Math.floor(K4 * temp1 * temp2 * 100) / 100)
}

/**
 * Fracción de fibras reclutadas según el voltaje (VRR, 0–1).
 * AS1: VRR = max(0, 1 - exp((thresh - V)/K3) * max(0, 1 - V/Vmax))
 */
export function voltageRecruitment(voltage: number, vMax = V_MAX): number {
  const var1 = Math.max(0, Math.exp((THRESHOLD - voltage) / K3))
  const var2 = Math.max(0, voltage / vMax)
  return Math.max(0, 1 - var1 * Math.max(0, 1 - var2))
}

/**
 * Factor de escala de la fuerza activa por la relación longitud–tensión.
 * AS1: activeScale = 1 - K7 * (L - Lnom)^2
 */
export function activeScale(length: number): number {
  return 1 - K7 * (length - L_NOM) ** 2
}

/** Punto de un trazo del osciloscopio */
export interface TracePoint {
  /** tiempo (ms) */
  t: number
  /** fuerza total (g) */
  force: number
}
