/** Datos de 14_SerologicT.swf (frame_2/DoAction_2.as: DFAMgr, ElisaMgr, WBMgr, ODDMgr) */

// ---------- Anticuerpos fluorescentes directos (clamidia) ----------

export interface DfaSlide {
  label: string
  /** cuerpos elementales fluorescentes: mínimo y máximo */
  elementary: [number, number]
  /** células del huésped en el campo */
  host: [number, number]
}

export const DFA: DfaSlide[] = [
  { label: 'A', elementary: [0, 0], host: [20, 28] },
  { label: 'B', elementary: [17, 19], host: [20, 28] },
  { label: 'C', elementary: [1, 3], host: [20, 28] },
  { label: '+', elementary: [19, 21], host: [20, 28] },
  { label: '−', elementary: [0, 0], host: [20, 28] }
]

/** Math.randomNum del original: entero entre a y b inclusive */
export const randomNum = (a: number, b: number, random: () => number = Math.random): number =>
  a + Math.floor(random() * (b - a + 1))

/** Campo del microscopio: células y cuerpos elementales en posiciones al azar */
export function microscopeField(
  slide: DfaSlide,
  random: () => number = Math.random
): { cells: Array<{ x: number; y: number }>; elementary: Array<{ x: number; y: number }> } {
  const n = randomNum(slide.host[0], slide.host[1], random)
  const e = randomNum(slide.elementary[0], slide.elementary[1], random)
  const pos = (): { x: number; y: number } => {
    const r = 42 * Math.sqrt(random())
    const a = random() * 2 * Math.PI
    return { x: 50 + r * Math.cos(a), y: 50 + r * Math.sin(a) }
  }
  return { cells: Array.from({ length: n }, pos), elementary: Array.from({ length: e }, pos) }
}

// ---------- Doble difusión de Ouchterlony ----------

/** frascos para los pocillos: antisueros de cabra anti-caballo y anti-bovino, BSA, HSA y desconocido */
export const ODD_REAGENTS = ['goatAH', 'goatAB', 'bsa', 'hsa', 'unknown'] as const
export type OddReagent = (typeof ODD_REAGENTS)[number]

/** pares de pocillos con línea de precipitación y su relación (sampleList) */
export const ODD_PAIRS: Array<{ wells: [number, number]; identity: OddIdentity }> = [
  { wells: [2, 5], identity: 'partial' },
  { wells: [2, 3], identity: 'complete' },
  { wells: [3, 4], identity: 'partial' },
  { wells: [4, 5], identity: 'complete' }
]
export type OddIdentity = 'complete' | 'partial' | 'none'
export const ODD_HOURS = 16

// ---------- ELISA indirecto ----------

export interface ElisaWell {
  sample: 'negative' | 'patientA' | 'patientB' | 'patientC' | 'positive'
  od: number
  color: [number, number, number]
}

/** densidad óptica y color final de cada pocillo (wellBlood) */
export const ELISA: ElisaWell[] = [
  { sample: 'positive', od: 1.624, color: [41, 113, 165] },
  { sample: 'negative', od: 0.154, color: [152, 221, 248] },
  { sample: 'patientA', od: 0.054, color: [145, 149, 209] },
  { sample: 'patientB', od: 0.432, color: [120, 211, 245] },
  { sample: 'patientC', od: 1.99, color: [34, 91, 134] }
]
export const ELISA_HOURS = 1

// ---------- Western blot (VIH) ----------

export const WB_BANDS = ['gp160', 'gp120', 'p55', 'p31', 'p24'] as const

/** bandas presentes en la tira de cada muestra */
export const WESTERN_BLOT: Array<{ sample: 'patientA' | 'patientB' | 'patientC' | 'positive' | 'negative'; bands: boolean[] }> = [
  { sample: 'patientA', bands: [false, false, false, false, false] },
  { sample: 'patientB', bands: [false, false, true, false, true] },
  { sample: 'patientC', bands: [true, true, true, false, true] },
  { sample: 'positive', bands: [true, true, true, true, true] },
  { sample: 'negative', bands: [false, false, false, false, false] }
]
export const WB_MINUTES = 30
