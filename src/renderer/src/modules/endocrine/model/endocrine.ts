/** Datos de 10_EndoPhysio.swf (frames 5, 15, 25 y 35) */

// ---------- Experimento 1: metabolismo ----------

export type Rat = 'normal' | 'tx' | 'hypox'
export const RATS: Rat[] = ['normal', 'tx', 'hypox']
export type Hormone = 'none' | 'thyroxine' | 'tsh' | 'ptu'
export const HORMONES: Exclude<Hormone, 'none'>[] = ['thyroxine', 'tsh', 'ptu']

/**
 * ml de O₂ consumidos por segundo según la hormona inyectada y la rata
 * (normal, tiroidectomizada, hipofisectomizada).
 */
export const O2_RATE: Record<Hormone, Record<Rat, number>> = {
  none: { normal: 0.11833333333333333, tx: 0.105, hypox: 0.105 },
  thyroxine: { normal: 0.12666666666666665, tx: 0.11833333333333333, hypox: 0.11833333333333333 },
  tsh: { normal: 0.12666666666666665, tx: 0.105, hypox: 0.11833333333333333 },
  ptu: { normal: 0.105, tx: 0.105, hypox: 0.105 }
}

/** O₂ consumido (ml, 1 decimal) tras `seconds` con la cámara cerrada */
export function oxygenUsed(rat: Rat, hormone: Hormone, seconds: number): number {
  return Math.round(O2_RATE[hormone][rat] * seconds * 10) / 10
}

/** Peso de la rata: 249–250.9 g la normal, 244–245.9 g las operadas (random(20)/10) */
export function ratWeight(rat: Rat, random: () => number = Math.random): number {
  const base = rat === 'normal' ? 249 : 244
  return base + Math.floor(random() * 20) / 10
}

/** temporizador 0–10 min; el reloj avanza 0.2 s por frame (4 s por segundo real) */
export const METABOLISM_TIMER_MAX = 600
export const SECONDS_PER_FRAME = 0.2
export const O2_SYRINGE = { min: 0, max: 20, step: 0.1 }

/** m:ss */
export const clock = (seconds: number): string => {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds) - m * 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// ---------- Experimento 2: terapia de reemplazo hormonal ----------

/** peso del útero (g) según el número de inyecciones de estrógeno (a_uteweight) */
export const UTERUS_WEIGHT = [
  '0.10', '0.19', '0.26', '0.34', '0.42', '0.50', '0.58', '0.66', '0.74', '0.82', '0.90', '0.98', '1.06', '1.14',
  '1.22', '1.30'
]
export const MAX_DAYS = 15

/**
 * Lectura de la balanza: el original concatenaba dos dígitos al azar al peso de la tabla
 * ("0.42" + "3" + "7" → 0.4237 g).
 */
export function uterusReading(estrogen: number, random: () => number = Math.random): number {
  const d = (): number => Math.floor(random() * 9)
  return Number(`${UTERUS_WEIGHT[Math.min(estrogen, UTERUS_WEIGHT.length - 1)]}${d()}${d()}`)
}

/** papel de pesar solo: 0.91xx g */
export function paperReading(random: () => number = Math.random): number {
  const d = (): number => Math.floor(random() * 9)
  return Number(`0.91${d()}${d()}`)
}

// ---------- Experimentos 3 y 4: insulina y diabetes ----------

/** Curva patrón: gotas de glucosa estándar y de agua por tubo, densidad óptica y glucosa */
export const STANDARD = {
  glucoseDrops: [1, 2, 3, 4, 5],
  waterDrops: [4, 3, 2, 1, 0],
  opticalDensity: [0.3, 0.5, 0.6, 0.8, 1],
  glucose: [30, 60, 90, 120, 150]
}

/** Recta de mínimos cuadrados de la curva patrón (la "Graph" del espectrofotómetro) */
export function standardLine(): { slope: number; intercept: number } {
  const xs = STANDARD.glucose
  const ys = STANDARD.opticalDensity
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length
  const my = ys.reduce((a, b) => a + b, 0) / ys.length
  let num = 0
  let den = 0
  xs.forEach((x, i) => {
    num += (x - mx) * (ys[i] - my)
    den += (x - mx) ** 2
  })
  const slope = num / den
  return { slope, intercept: my - slope * mx }
}

/**
 * Parte 2: muestras de sangre. Tubos 1 y 2 = primera muestra de la rata control (solución
 * salina) y de la experimental (aloxano); tubos 3 y 4 = después de inyectar insulina.
 */
export const DIABETES = {
  opticalDensity: [0.62, 0.87, 0.62, 0.68],
  /** glucosa esperada al leer la curva (el alumno la lee arrastrando la línea) */
  expectedGlucose: [87, 135, 87, 93],
  insulin: [false, false, true, true],
  saline: [true, false, true, false],
  alloxan: [false, true, false, true]
}

/** la línea de lectura recorre 310 px y glucosa = x/2 */
export const GLUCOSE_READING = { min: 0, max: 155, step: 1 }

/** pasos de los procedimientos con animación (frames del original) */
export const MIX_FRAMES = 60
export const CENTRIFUGE_FRAMES = 61
export const INCUBATE_FRAMES = 61
