/**
 * Modelo de 09_NeuroNerve.swf. La pantalla del osciloscopio tiene 360 píxeles de ancho
 * (36 por división, 10 divisiones); cada píxel es un punto del trazo.
 */

export const PIXELS = 360
export const PX_PER_DIV = 36

/** Voltaje de los estimuladores: 0–10 V en pasos de 0.1 */
export const VOLTAGE = { min: 0, max: 10, step: 0.1 }
/** Estímulos por segundo (estímulos múltiples): 1–15 */
export const STIM_RATE = { min: 1, max: 15, step: 1 }
/** Intervalo entre estímulos (min) para la inhibición: 0–10 */
export const INTERVAL = { min: 0, max: 10, step: 1 }

/** distancia entre electrodos de estímulo y registro en la cámara (mm) */
export const NCV_DISTANCE = 43

/** cos(gomp(-∞) + π/4): valor de reposo de la curva, el trazo plano está en amp·REST */
export const REST = -0.6002420240621952

/** Curva de Gompertz que da forma al potencial de acción (f_makeGompertz), 540 puntos */
export const GOMPERTZ: readonly number[] = Array.from({ length: 540 }, (_, i) => {
  const t = -4.5 + i / 36
  const term1 = Math.pow(14, -0.7 * (t + 4.2))
  const term2 = Math.pow(14, -10000 * term1)
  const gomp = 6.28 * term2 - 3
  return Math.cos(gomp + 0.7854)
})

export interface StimParams {
  vThresh: number
  vMax: number
  ampLow: number
  ampMax: number
  /** retardo del potencial de acción (ms) */
  tDelay: number
}

/** Estimulador eléctrico de los experimentos 1 y 2 */
export const ELECTRIC: StimParams = { vThresh: 3, vMax: 4, ampLow: 40, ampMax: 45, tDelay: 2.5 }

export type NerveId = 'worm' | 'frog' | 'rat1' | 'rat2'
export const NERVES: NerveId[] = ['worm', 'frog', 'rat1', 'rat2']

/** Umbral y retardo de cada nervio en la velocidad de conducción (f_do_ncvStimulate) */
export const NERVE_PARAMS: Record<NerveId, StimParams> = {
  worm: { vThresh: 5, vMax: 6, ampLow: 40, ampMax: 45, tDelay: 4.5 },
  frog: { vThresh: 3, vMax: 4, ampLow: 40, ampMax: 45, tDelay: 1.2 },
  rat1: { vThresh: 2.5, vMax: 3.5, ampLow: 40, ampMax: 45, tDelay: 2.1 },
  rat2: { vThresh: 3, vMax: 4, ampLow: 40, ampMax: 45, tDelay: 0.5 }
}

export interface TracePoint {
  /** posición en divisiones (0–10) */
  x: number
  y: number
}

/**
 * Amplitud de la respuesta a un estímulo eléctrico (f_elecStim): por debajo del umbral no hay
 * potencial de acción; entre el umbral y vMax crece linealmente de ampLow a ampMax.
 */
export function stimulusAmplitude(vStim: number, p: StimParams): { fires: boolean; amp: number } {
  if (vStim < p.vThresh) return { fires: false, amp: p.ampLow }
  if (vStim >= p.vMax) return { fires: true, amp: p.ampMax }
  const slope = (p.ampMax - p.ampLow) / (p.vMax - p.vThresh)
  return { fires: true, amp: p.ampLow + slope * (vStim - p.vThresh) }
}

/** Trazo de un potencial de acción (f_actionPot) */
export function actionPotential(amp: number, delay: number): TracePoint[] {
  const fact = Math.round((4.5 - delay) * 36)
  return Array.from({ length: PIXELS }, (_, i) => ({ x: i / PX_PER_DIV, y: amp * GOMPERTZ[i + fact] }))
}

/** Trazo plano en el potencial de reposo (f_flatLine) */
export function flatLine(vRest: number): TracePoint[] {
  return Array.from({ length: PIXELS }, (_, i) => ({ x: i / PX_PER_DIV, y: vRest }))
}

/** Respuesta completa a un estímulo único: potencial de acción o línea plana */
export function singleStimulus(vStim: number, p: StimParams, blocked = false): {
  actionPotential: boolean
  points: TracePoint[]
} {
  const { fires, amp } = stimulusAmplitude(vStim, p)
  if (fires && !blocked) return { actionPotential: true, points: actionPotential(amp, p.tDelay) }
  return { actionPotential: false, points: flatLine(amp * REST) }
}

/**
 * Estímulos repetidos (f_multiStim / f_repeatStim): en escala de segundos o minutos cada potencial
 * de acción se ve como una línea vertical de ±amp. Devuelve la altura de esa línea (0 si no dispara)
 * y el nivel de reposo de la línea base.
 */
export function repeatedStimulus(vStim: number, p: StimParams): { spike: number; rest: number } {
  if (vStim < p.vThresh) return { spike: 0, rest: p.ampLow * REST }
  const { amp } = stimulusAmplitude(vStim, p)
  return { spike: amp, rest: amp * REST }
}

/**
 * Píxeles en los que cae un estímulo para un periodo dado (en píxeles): el original dibujaba la
 * línea cuando `pix % period` volvía a empezar.
 */
export function isStimulusPixel(pix: number, period: number): boolean {
  if (pix === 0) return true
  return pix % period < (pix - 1) % period
}

/** Velocidad de conducción (m/s = mm/ms) para la distancia de la cámara */
export function conductionVelocity(timeMs: number): number | null {
  return timeMs === 0 ? null : NCV_DISTANCE / timeMs
}
