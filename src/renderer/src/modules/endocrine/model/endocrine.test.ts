import { describe, expect, it } from 'vitest'
import { DIABETES, STANDARD, oxygenUsed, ratWeight, standardLine, uterusReading } from './endocrine'

describe('metabolismo', () => {
  it('la rata normal consume 7.1 ml de O₂ por minuto y la tiroidectomizada 6.3', () => {
    expect(oxygenUsed('normal', 'none', 60)).toBe(7.1)
    expect(oxygenUsed('tx', 'none', 60)).toBe(6.3)
  })

  it('la tiroxina sube el consumo de la tiroidectomizada; el TSH no (falta la tiroides)', () => {
    expect(oxygenUsed('tx', 'thyroxine', 60)).toBe(7.1)
    expect(oxygenUsed('tx', 'tsh', 60)).toBe(6.3)
    expect(oxygenUsed('hypox', 'tsh', 60)).toBe(7.1)
  })

  it('pesos de las ratas', () => {
    expect(ratWeight('normal', () => 0)).toBe(249)
    expect(ratWeight('tx', () => 0.99)).toBe(245.9)
  })
})

describe('reemplazo hormonal', () => {
  it('el útero pesa más con cada inyección de estrógeno', () => {
    expect(uterusReading(0, () => 0)).toBe(0.1)
    expect(uterusReading(4, () => 0.5)).toBe(0.4244)
    expect(uterusReading(15, () => 0)).toBe(1.3)
  })
})

describe('insulina y diabetes', () => {
  it('la recta patrón sube con la glucosa', () => {
    const { slope } = standardLine()
    expect(slope).toBeGreaterThan(0)
    expect(STANDARD.glucose).toHaveLength(STANDARD.opticalDensity.length)
  })

  it('leer la recta da las glucosas esperadas de los tubos de la parte 2 (±5 mg/dl)', () => {
    const { slope, intercept } = standardLine()
    DIABETES.opticalDensity.forEach((od, i) => {
      expect(Math.abs((od - intercept) / slope - DIABETES.expectedGlucose[i])).toBeLessThan(5)
    })
  })
})
