/**
 * Formatea un número con un número fijo de decimales, como f_fixDisplayField del original
 * (primero redondea a 2 decimales).
 */
export function fixed(num: number | null | undefined, decimals: 1 | 2 = 2): string {
  if (num === null || num === undefined || Number.isNaN(num)) return ''
  return (Math.round(num * 100) / 100).toFixed(decimals)
}

/** Fecha corta m/d/aaaa o d/m/aaaa según el idioma */
export function shortDate(lang: string, date = new Date()): string {
  return date.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US')
}

/** Escala “bonita” para ejes, igual que f_setAxis de plot_data.swf */
const AXIS_STEPS = [2, 4, 6, 10, 20, 40, 60, 100, 150, 200, 250]
export function niceAxisMax(maxValue: number): number {
  for (const s of AXIS_STEPS) if (maxValue < s) return s
  return Math.ceil(maxValue / 100) * 100
}

export const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v))

/** Evita errores de punto flotante al sumar pasos de 0.1 */
export const roundTo = (v: number, decimals: number): number => {
  const f = 10 ** decimals
  return Math.round(v * f) / f
}
