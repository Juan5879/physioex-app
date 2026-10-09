import { describe, expect, it } from 'vitest'
import { DFA, ELISA, WESTERN_BLOT, microscopeField, randomNum } from './serology'

describe('pruebas serológicas', () => {
  it('el campo del microscopio respeta los rangos del original', () => {
    const r = (): number => 0.99
    const b = microscopeField(DFA[1], r)
    expect(b.elementary).toHaveLength(19)
    expect(b.cells).toHaveLength(28)
    expect(microscopeField(DFA[0], r).elementary).toHaveLength(0)
    expect(randomNum(17, 19, () => 0)).toBe(17)
  })

  it('el control positivo del ELISA supera al negativo', () => {
    const od = (s: string): number => ELISA.find((w) => w.sample === s)?.od ?? 0
    expect(od('positive')).toBeGreaterThan(od('negative'))
    expect(od('patientC')).toBeGreaterThan(od('patientA'))
  })

  it('el control positivo del Western blot tiene las cinco bandas', () => {
    expect(WESTERN_BLOT.find((w) => w.sample === 'positive')?.bands.every(Boolean)).toBe(true)
    expect(WESTERN_BLOT.find((w) => w.sample === 'negative')?.bands.some(Boolean)).toBe(false)
  })
})
