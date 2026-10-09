import { describe, expect, it } from 'vitest'
import { MetabolicRun, METABOLIC, RENAL, RespiratoryRun, noisyPh } from './acidBase'

const fixed = (): number => 0.5

describe('acidosis y alcalosis respiratorias', () => {
  it('la hiperventilación baja la PCO₂ y sube el pH (alcalosis)', () => {
    const r = new RespiratoryRun(fixed)
    for (let i = 0; i < 20; i++) r.stepFrame()
    r.hyperventilate()
    while (!r.done) r.stepFrame()
    expect(r.minPco2).toBeLessThan(40)
    expect(r.maxPh).toBeGreaterThan(7.45)
  })

  it('reinhalar sube la PCO₂ y baja el pH (acidosis)', () => {
    const r = new RespiratoryRun(fixed)
    for (let i = 0; i < 20; i++) r.stepFrame()
    r.rebreathe()
    while (!r.done) r.stepFrame()
    expect(r.maxPco2).toBeGreaterThan(40)
    expect(r.minPh).toBeLessThan(7.38)
  })

  it('la corrida dura 600 ticks (60 s)', () => {
    const r = new RespiratoryRun(fixed)
    while (!r.done) r.stepFrame()
    expect(r.points.at(-1)?.x).toBeCloseTo(60, 0)
  })
})

describe('acidosis y alcalosis metabólicas', () => {
  it('a mayor tasa metabólica, más respiraciones y menor pH', () => {
    const lo = new MetabolicRun(0, fixed).result()
    const hi = new MetabolicRun(12, fixed).result()
    expect(hi.bpm).toBeGreaterThan(lo.bpm)
    expect(hi.ph).toBeLessThan(lo.ph)
    expect(hi.hco3).toBeLessThan(lo.hco3)
    expect(METABOLIC.rate[6]).toBe(50)
  })

  it('el ruido del pH está entre −0.02 y +0.01', () => {
    expect(noisyPh(7.4, () => 0)).toBe(7.38)
    expect(noisyPh(7.4, () => 0.99)).toBe(7.41)
  })
})

describe('compensación renal', () => {
  it('con PCO₂ alta los riñones excretan H⁺ y retienen HCO₃⁻', () => {
    const i = RENAL.pco2.indexOf(75)
    expect(RENAL.h[i]).toBe('elevated')
    expect(RENAL.hco3[i]).toBe('decreased')
  })
})
