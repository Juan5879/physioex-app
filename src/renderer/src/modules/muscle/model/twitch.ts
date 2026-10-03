import { K2, K2_K1, LATENT } from './constants'
import { activeScale, passiveForce, round2, voltageRecruitment, type TracePoint } from './common'

export interface TwitchParams {
  voltage: number
  length: number
  /** ventana de tiempo del barrido (ms) */
  tMax: number
  /** número de “píxeles” del barrido original (360 en estímulo único, 180 en isométrica) */
  samples: number
}

export interface TwitchResult {
  points: TracePoint[]
  activeMax: number
  passive: number
  totalMax: number
}

/**
 * Fuerza activa de una contracción simple (twitch) en el tiempo t.
 * AS1: F_act = K2K1 * c * exp(-K2 * c) * VRR * activeScale, con c = max(0, t - latent)
 */
export function twitchActiveForce(t: number, vrr: number, scale: number): number {
  const c = Math.max(0, t - LATENT)
  let f = K2_K1 * c * Math.exp(-K2 * c) * vrr * scale
  if (f > 0) f = round2(f)
  return f
}

/**
 * Simula una contracción simple (experimentos “Single Stimulus” e “Isometric Contraction”).
 * Igual que el bucle original: avanza de 2 en 2 píxeles, cada píxel = tMax/samples ms.
 */
export function simulateTwitch({ voltage, length, tMax, samples }: TwitchParams): TwitchResult {
  const vrr = voltageRecruitment(voltage)
  const scale = activeScale(length)
  const passive = passiveForce(length)
  const inc = tMax / samples
  const points: TracePoint[] = []
  let activeMax = 0
  let t = 0
  for (let pix = 0; pix < samples; pix += 2) {
    const fAct = twitchActiveForce(t, vrr, scale)
    points.push({ t, force: fAct + passive })
    if (fAct > activeMax) activeMax = fAct
    t += inc * 2
  }
  return { points, activeMax, passive, totalMax: activeMax + passive }
}
