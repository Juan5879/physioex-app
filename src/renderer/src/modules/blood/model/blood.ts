/**
 * Datos de 13_Blood.swf. Las muestras son las del original (valores en los `onClipEvent(load)`
 * de cada tubo o frasco, en el orden en que aparecen en pantalla).
 */

// ---------- 1. Hematocrito ----------

/** altura total, capa de glóbulos rojos y capa leucocitaria (mm) de las muestras 1–6 */
export const HEMATOCRIT: Array<{ total: number; rbc: number; buffy: number }> = [
  { total: 100, rbc: 48, buffy: 1 },
  { total: 100, rbc: 44, buffy: 1 },
  { total: 100, rbc: 55, buffy: 1 },
  { total: 100, rbc: 53, buffy: 1 },
  { total: 100, rbc: 19, buffy: 0.5 },
  { total: 100, rbc: 32, buffy: 1 }
]

export const hematocrit = (s: { total: number; rbc: number }): number => Math.round((s.rbc / s.total) * 100)
export const wbcPercent = (s: { total: number; buffy: number }): number => (s.buffy / s.total) * 100

/** el centrifugado dura lo que marque el temporizador (min) */
export const CENTRIFUGE_TIMER = { min: 0, max: 10, step: 1, initial: 5 }

// ---------- 2. Velocidad de sedimentación ----------

/** distancia que bajan los eritrocitos en 60 min (mm) */
export const ESR = [5, 15, 0, 30, 40, 5]
export const ESR_MINUTES = 60

/** sedimentación proporcional al tiempo transcurrido */
export const esrDistance = (sample: number, minutes: number): number =>
  Math.round(ESR[sample] * Math.min(1, minutes / ESR_MINUTES) * 10) / 10

// ---------- 3. Hemoglobina ----------

/** g de Hb por 100 ml (y hematocrito de referencia) de las muestras 1–5 */
export const HEMOGLOBIN: Array<{ hb: number; pcv: number }> = [
  { hb: 16, pcv: 48 },
  { hb: 14, pcv: 44 },
  { hb: 8, pcv: 40 },
  { hb: 20, pcv: 60 },
  { hb: 22, pcv: 60 }
]
/** verde de la muestra en el hemoglobinómetro (colourArray, canal G) */
export const HB_SAMPLE_GREEN = [99, 121, 183, 66, 43]
/** el deslizador del hemoglobinómetro va de 24 a 4 g/100 ml */
export const HB_SCALE = { min: 4, max: 24, step: 1 }

/** verde del patrón para una lectura: aproxima la escala de colores del original */
export const hbGreen = (gm: number): number => Math.max(20, Math.min(220, Math.round(99 + (16 - gm) * 11)))

// ---------- 4. Tipificación sanguínea ----------

export type Serum = 'A' | 'B' | 'Rh'
/** aglutinación con los sueros anti-A, anti-B y anti-Rh (imageArray) */
export const TYPING: Array<Record<Serum, boolean>> = [
  { A: true, B: false, Rh: true },
  { A: false, B: true, Rh: true },
  { A: true, B: true, Rh: false },
  { A: false, B: false, Rh: false },
  { A: true, B: true, Rh: true },
  { A: false, B: true, Rh: false }
]

/** grupo sanguíneo a partir de la aglutinación */
export function bloodType(r: Record<Serum, boolean>): string {
  const abo = r.A && r.B ? 'AB' : r.A ? 'A' : r.B ? 'B' : 'O'
  return `${abo}${r.Rh ? '+' : '−'}`
}

// ---------- 5. Colesterol ----------

/** colesterol total de los pacientes 1–4 (mg/dL) */
export const CHOLESTEROL = [150, 300, 150, 225]
export const CHOLESTEROL_MINUTES = 3

/** rueda de colores del original: valor, color y nivel */
export const CHOL_WHEEL: Array<{ value: number; color: string; level: 'desirable' | 'borderline' | 'elevated' | 'na' }> = [
  { value: 150, color: '#7ADE7A', level: 'desirable' },
  { value: 175, color: '#66CC66', level: 'na' },
  { value: 200, color: '#4BAF4B', level: 'na' },
  { value: 225, color: '#339933', level: 'borderline' },
  { value: 250, color: '#1B7A1B', level: 'na' },
  { value: 300, color: '#006600', level: 'elevated' }
]

export const cholColor = (value: number): string =>
  CHOL_WHEEL.reduce((a, b) => (Math.abs(b.value - value) < Math.abs(a.value - value) ? b : a)).color
