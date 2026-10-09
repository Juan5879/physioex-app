import { describe, expect, it } from 'vitest'
import { pumpCalc, vesselFlow, type PumpInput } from './cardio'

describe('resistencia vascular', () => {
  it('flujo de Poiseuille con los valores iniciales', () => {
    const { flow } = vesselFlow({ pressure: 100, radius: 3, viscosity: 3.5, length: 50 })
    expect(flow).toBeCloseTo((3.14 * 81 * 100) / (8 * 50 * 3.5), 10)
  })

  it('el flujo crece con la cuarta potencia del radio', () => {
    const a = vesselFlow({ pressure: 100, radius: 2, viscosity: 3.5, length: 50 }).flow
    const b = vesselFlow({ pressure: 100, radius: 4, viscosity: 3.5, length: 50 }).flow
    expect(b / a).toBeCloseTo(16, 10)
  })

  it('sin presión o con flujo muy bajo no hay corrida', () => {
    expect(vesselFlow({ pressure: 0, radius: 3, viscosity: 3.5, length: 50 })).toEqual({
      flow: 0,
      alert: 'insufficientDrive'
    })
    expect(vesselFlow({ pressure: 1, radius: 1, viscosity: 10, length: 50 }).alert).toBe('lowFlow')
  })
})

describe('mecánica de la bomba', () => {
  const base: PumpInput = {
    volumeL: 5000,
    strokes: 10,
    strokeVolume: 70,
    pressureL: 40,
    pressurePump: 120,
    pressureR: 80,
    radiusL: 3,
    radiusR: 3
  }

  it('frecuencia = fL·fR / (VS·(fL + fR)) y flujo = frecuencia·VS', () => {
    const r = pumpCalc(base)
    if ('alert' in r) throw new Error(r.alert)
    const f = 81 * 40 * 3.14
    expect(r.rate).toBeCloseTo((f * f) / (70 * 2 * f), 10)
    expect(r.flow).toBeCloseTo(r.rate * 70, 10)
  })

  it('avisos de falta de líquido y de presión', () => {
    expect(pumpCalc({ ...base, volumeL: 100 })).toEqual({ alert: 'insufficientFluid' })
    expect(pumpCalc({ ...base, pressureL: 0 })).toEqual({ alert: 'noSourcePressure' })
    expect(pumpCalc({ ...base, pressureR: 120 })).toEqual({ alert: 'lowOutflow' })
  })
})
