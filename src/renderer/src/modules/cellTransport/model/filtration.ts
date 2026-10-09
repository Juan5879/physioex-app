import { EXPERIMENT_SOLUTES, FILTER_THROUGH, type SoluteId } from './constants'
import type { Conc } from './transport'

export interface FiltrationResult {
  /** velocidad de filtración (ml/min) */
  rate: number
  /** minutos que tarda en filtrarse todo el vaso (100 ml) */
  timeRequired: number
  /** concentración de cada soluto en el filtrado (mg/ml) */
  filtrate: Conc
}

/**
 * Filtración (f_startFiltration): la velocidad depende de la presión y del poro de la membrana;
 * cada soluto atraviesa en una proporción fija si cabe por el poro.
 */
export function filtration(pressure: number, mwco: number, top: Conc): FiltrationResult {
  const rate = pressure * mwco * 0.001
  const through: Partial<Record<SoluteId, number>> = {
    NaCl: mwco < 50 ? 0 : FILTER_THROUGH.NaCl,
    Urea: mwco < 100 ? 0 : FILTER_THROUGH.Urea,
    Gluc: mwco < 200 ? 0 : FILTER_THROUGH.Gluc,
    PoCh: FILTER_THROUGH.PoCh
  }
  const filtrate: Conc = {}
  for (const s of EXPERIMENT_SOLUTES.fl) {
    const amount = top[s] ?? 0
    filtrate[s] = amount > 0 ? amount * (through[s] ?? 0) : 0
  }
  return { rate, timeRequired: 100 / rate, filtrate }
}

/** Análisis del residuo de la membrana: hay residuo de todo soluto que había en el vaso */
export function residuePresent(top: Conc, s: SoluteId): boolean {
  return Math.round((top[s] ?? 0) * 100) !== 0
}
