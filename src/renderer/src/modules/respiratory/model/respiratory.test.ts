import { describe, expect, it } from 'vitest'
import { BreathingRun, FactorsRun, VolumesRun, deflate, newLungs } from './respiratory'

function runVolumes(radius: number, act?: (r: VolumesRun, frame: number) => void): VolumesRun {
  const r = new VolumesRun(radius)
  for (let i = 0; !r.done && i < 1000; i++) {
    act?.(r, i)
    r.step()
  }
  return r
}

describe('volúmenes respiratorios', () => {
  it('respiración normal: volumen corriente positivo y frecuencia 15', () => {
    const r = runVolumes(5)
    expect(r.results.tidal).toBeGreaterThan(400)
    expect(r.results.pumpRate).toBe(15)
    expect(r.points.at(-1)?.x).toBeCloseTo(60, 0)
  })

  it('un tubo más angosto reduce el volumen corriente (r⁴)', () => {
    expect(runVolumes(4).results.tidal ?? 0).toBeLessThan(runVolumes(5).results.tidal ?? 0)
  })

  it('FVC mide capacidad vital, FEV1 y capacidad pulmonar total', () => {
    const r = runVolumes(5, (run, i) => i === 20 && run.requestFVC())
    const { tidal, expReserve, inspReserve, residual, vitalCapacity, totalLungCapacity, fev1 } = r.results
    expect(vitalCapacity).toBeCloseTo((tidal ?? 0) + (expReserve ?? 0) + (inspReserve ?? 0), -1)
    expect(totalLungCapacity).toBeCloseTo((vitalCapacity ?? 0) + (residual ?? 0), -1)
    expect(fev1).toBeGreaterThan(0)
    expect(fev1 ?? 0).toBeLessThan(vitalCapacity ?? 0)
  })

  it('ERV mide el volumen de reserva espiratoria', () => {
    const r = runVolumes(5, (run, i) => i === 20 && run.requestERV())
    expect(r.results.expReserve).toBeGreaterThan(0)
    expect(r.results.residual).toBeGreaterThan(0)
  })
})

describe('factores que afectan la respiración', () => {
  const run = (f: FactorsRun): FactorsRun => {
    while (!f.done) f.step()
    return f
  }

  it('el flujo total es la suma de ambos pulmones', () => {
    const r = run(new FactorsRun(5, 15, 5, newLungs())).results
    expect(r?.totalFlow).toBeCloseTo((r?.flowL ?? 0) + (r?.flowR ?? 0), 6)
    expect(r?.flowL).toBeCloseTo(r?.flowR ?? 0, 6)
  })

  it('con un pulmón colapsado no hay flujo ni presión de ese lado', () => {
    const r = run(new FactorsRun(5, 15, 5, deflate(newLungs(), 'L'))).results
    expect(r?.flowL).toBe(0)
    expect(r?.pressureL).toBe(0)
    expect(r?.flowR).toBeGreaterThan(0)
  })

  it('el surfactante aumenta el flujo', () => {
    const a = run(new FactorsRun(5, 15, 5, newLungs())).results?.totalFlow ?? 0
    const b = run(new FactorsRun(5, 15, 8, newLungs())).results?.totalFlow ?? 0
    expect(b).toBeGreaterThan(a)
  })
})

describe('variaciones en la respiración', () => {
  it('la respiración rápida baja la PCO₂ y aguantar la respiración la sube', () => {
    const rapid = new BreathingRun(5, () => 0.5)
    for (let i = 0; i < 20; i++) rapid.step()
    rapid.rapid()
    while (!rapid.done) rapid.step()
    expect(rapid.results?.minPco2 ?? 99).toBeLessThan(45)
    expect(rapid.results?.condition).toBe('rapid')

    const hold = new BreathingRun(5, () => 0.5)
    for (let i = 0; i < 20; i++) hold.step()
    hold.holdBreath()
    while (!hold.done) hold.step()
    expect(hold.results?.maxPco2 ?? 0).toBeGreaterThan(45)
  })
})
