/**
 * Modelo de 05_Digestion.swf (frame_2/DoAction_3.as: objeto `tube`; DoAction_5.as: pruebas).
 * Cada tubo tiene sustrato (5 al agregarlo) que la enzima convierte en producto cada minuto de
 * incubación según la temperatura y el pH.
 */

export type DigestExperiment = 'am' | 'pe' | 'li'
export type ReagentType = 'enzyme' | 'substrate' | 'product' | 'ph' | 'water' | 'helper'

export interface ReagentInfo {
  type: ReagentType
}

/** reactivos de cada experimento (a_reactType), en el orden de los frascos */
export const REAGENTS: Record<DigestExperiment, Record<string, ReagentType>> = {
  am: {
    amylase: 'enzyme',
    starch: 'substrate',
    maltose: 'product',
    ph2: 'ph',
    ph7: 'ph',
    ph9: 'ph',
    water: 'water',
    glucose: 'product',
    cellulose: 'substrate',
    peptidase: 'enzyme',
    bacteria: 'enzyme'
  },
  pe: { pepsin: 'enzyme', bapna: 'substrate', ph2: 'ph', ph7: 'ph', ph9: 'ph', water: 'water' },
  li: { lipase: 'enzyme', oil: 'substrate', bile: 'helper', ph2: 'ph', ph7: 'ph', ph9: 'ph', water: 'water' }
}

/** reactivos por tubo y parámetros de pH de cada enzima */
const CONFIG: Record<DigestExperiment, { maxReagents: number; maxDeltaPh: number; noReactionPh: number; optimalPh: number }> = {
  am: { maxReagents: 3, maxDeltaPh: 2, noReactionPh: 5.1, optimalPh: 7 },
  pe: { maxReagents: 3, maxDeltaPh: 5.1, noReactionPh: 5.1, optimalPh: 2 },
  li: { maxReagents: 4, maxDeltaPh: 2, noReactionPh: 2.1, optimalPh: 7 }
}

export const maxReagents = (exp: DigestExperiment): number => CONFIG[exp].maxReagents

export const TUBES = 7
export const TIMER = { min: 5, max: 90, step: 5, initial: 60 }
/** temperatura: −30 a 100 °C (la pepsina, 5 a 100) */
export const TEMPERATURE: Record<DigestExperiment, { min: number; max: number; step: number }> = {
  am: { min: -30, max: 100, step: 1 },
  pe: { min: 5, max: 100, step: 1 },
  li: { min: -30, max: 100, step: 1 }
}

const DENATURATION_TEMP = 68
const OPTIMAL_TEMP = 37
const MAX_DELTA_TEMP = 15
const TIME_FUDGE = 0.07
const BILE_SALTS_FACTOR = 0.1

export interface Tube {
  reagents: string[]
  boiled: boolean
  /** pH del tampón (7 si no se agregó) */
  pH: number
  enzyme: string | null
  substrate: string | null
  helper: boolean
  concSubstrate: number
  concProduct: number
}

export const emptyTube = (): Tube => ({
  reagents: [],
  boiled: false,
  pH: 7,
  enzyme: null,
  substrate: null,
  helper: false,
  concSubstrate: 0,
  concProduct: 0
})

export type AddResult =
  | { ok: true; tube: Tube }
  | { ok: false; reason: 'full' | 'duplicate' | 'typePresent' | 'bufferPresent' | 'bacteriaAlt' | 'enzymeAlt'; detail?: string }

/** Agregar un reactivo (f_checkDropperHit): no se repite un tipo y hay un máximo por tubo */
export function addReagent(exp: DigestExperiment, tube: Tube, name: string): AddResult {
  const type = REAGENTS[exp][name]
  if (tube.reagents.length >= CONFIG[exp].maxReagents) return { ok: false, reason: 'full' }
  const sameType = tube.reagents.find((r) => REAGENTS[exp][r] === type)
  if (tube.reagents.includes(name)) return { ok: false, reason: type === 'ph' ? 'bufferPresent' : 'duplicate', detail: sameType }
  if (sameType) {
    if (type === 'ph') return { ok: false, reason: 'bufferPresent', detail: sameType }
    if (sameType === 'bacteria') return { ok: false, reason: 'bacteriaAlt' }
    if (name === 'bacteria') return { ok: false, reason: 'enzymeAlt' }
    return { ok: false, reason: 'typePresent', detail: type }
  }
  const t: Tube = { ...tube, reagents: [...tube.reagents, name] }
  if (type === 'enzyme') t.enzyme = name
  else if (type === 'ph') t.pH = Number(name.slice(2))
  else if (type === 'substrate') {
    t.substrate = name
    t.concSubstrate = 5
  } else if (type === 'product') t.concProduct = 5
  else if (type === 'helper') t.helper = true
  return { ok: true, tube: t }
}

export const isComplete = (exp: DigestExperiment, t: Tube): boolean => t.reagents.length === CONFIG[exp].maxReagents

/** Factores de temperatura y pH (initCalcs) */
export function activityFactors(exp: DigestExperiment, t: Tube, temp: number): { temp: number; pH: number } {
  if (!t.enzyme || !t.substrate || t.boiled) return { temp: 0, pH: 0 }
  const c = CONFIG[exp]
  let tf: number
  if (temp >= DENATURATION_TEMP) tf = 0
  else if (
    t.enzyme === 'peptidase' ||
    (t.enzyme === 'amylase' && t.substrate === 'cellulose') ||
    (t.enzyme === 'bacteria' && t.substrate === 'starch')
  )
    tf = 0
  else tf = Math.max(0.01, 1 - Math.abs(OPTIMAL_TEMP - temp) / MAX_DELTA_TEMP)
  const phDiff = Math.abs(c.optimalPh - t.pH)
  const pf = phDiff >= c.noReactionPh ? 0 : Math.max(0.01, 1 - phDiff / c.maxDeltaPh)
  return { temp: tf, pH: pf }
}

/** Un minuto de incubación (doCalcs) */
export function incubateStep(exp: DigestExperiment, t: Tube, temp: number, elapsed: number): Tube {
  if (!(t.concSubstrate > 0)) return t
  const n = { ...t }
  if (t.enzyme === 'bacteria' && t.substrate === 'cellulose') {
    if (temp < 30 || temp > 40 || t.pH !== 7) n.concSubstrate = 5
    else if (elapsed === 10) {
      n.concSubstrate = 3
      n.concProduct += 1
    } else if (elapsed === 20) {
      n.concSubstrate = 1
      n.concProduct += 2
    } else if (elapsed === 30) {
      n.concSubstrate = 0
      n.concProduct += 2
    }
    return n
  }
  const f = activityFactors(exp, t, temp)
  let delta = t.concSubstrate * TIME_FUDGE * f.temp * f.pH
  if (exp === 'li' && !t.helper) delta *= BILE_SALTS_FACTOR
  n.concSubstrate -= delta
  n.concProduct += delta
  if (n.concSubstrate < 0) {
    n.concSubstrate = 0
    n.concProduct = 5
  }
  return n
}

/**
 * Incubación completa: el original calculaba una vez al empezar y luego una vez por minuto
 * (con el minuto transcurrido antes de sumarlo), así que el minuto 0 se calcula dos veces.
 */
export function incubate(exp: DigestExperiment, t: Tube, temp: number, minutes: number): Tube {
  let n = incubateStep(exp, t, temp, 0)
  for (let e = 0; e < minutes; e++) n = incubateStep(exp, n, temp, e)
  return n
}

/** Lugol (IKI): almidón presente */
export const ikiResult = (t: Tube): '+' | '-' => (t.concSubstrate < 0.1 ? '-' : '+')
/** Benedict: azúcares reductores (producto) */
export const benedictResult = (t: Tube): '+' | '-' => (t.concProduct < 0.1 ? '-' : '+')
/** nivel de color 0–3 de las pruebas (umbrales 0.1, 1.5, 4) */
export const colorLevel = (amount: number): 0 | 1 | 2 | 3 => (amount < 0.1 ? 0 : amount < 1.5 ? 1 : amount < 4 ? 2 : 3)
/** Pepsina: densidad óptica del colorante liberado de BAPNA */
export const opticalDensity = (t: Tube): number => 0.4 * (t.concProduct / 5)
/** Lipasa: los ácidos grasos bajan el pH */
export const finalPh = (t: Tube): number => t.pH - 0.8 * (t.concProduct / 5)

/** colores de las pruebas del original */
export const IKI_COLORS = ['#c9b526', '#828282', '#4a5252', '#000000']
export const BENEDICT_COLORS = ['#0066e6', '#00e600', '#fc9c00', '#993300']
export const BAPNA_COLORS = ['#99ccff', '#ffffbd', '#ffff66', '#ffdd00']

/** color del pH (f_pHtoRGB) */
export function phColor(ph: number): string {
  const n = Math.floor(ph)
  const r = Math.max(0, Math.min(255, Math.round(((34 - 3 * n) / 28) * 255)))
  const g = Math.round(0.25 * 255)
  const b = Math.max(0, Math.min(255, Math.round(((1 + 3 * n) / 28) * 255)))
  return `rgb(${r}, ${g}, ${b})`
}
