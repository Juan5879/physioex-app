import { describe, expect, it } from 'vitest'
import { activeScale, passiveForce, voltageRecruitment } from './common'
import { L_NOM } from './constants'
import { simulateTwitch } from './twitch'
import { MultipleStimulusSim } from './multipleStimulus'
import { simulateIsotonic } from './isotonic'

function runSingleSweep(sim: MultipleStimulusSim, extraStimAtSteps: number[] = []): void {
  let step = 0
  sim.singleStimulus()
  while (sim.mode !== 'idle') {
    if (extraStimAtSteps.includes(step)) sim.singleStimulus()
    sim.step()
    step++
  }
}

function runTrain(sim: MultipleStimulusSim, rate: number, steps: number): void {
  sim.toggleTrain(rate)
  for (let i = 0; i < steps && sim.mode !== 'idle'; i++) sim.step()
}

describe('funciones comunes', () => {
  it('no hay reclutamiento por debajo del umbral y es máximo a 8.3 V', () => {
    expect(voltageRecruitment(0)).toBe(0)
    expect(voltageRecruitment(1.2)).toBeCloseTo(1 - (1 - 1.2 / 8.3), 6)
    expect(voltageRecruitment(8.3)).toBe(1)
    expect(voltageRecruitment(10)).toBe(1)
  })

  it('la fuerza activa crece de forma monótona con el voltaje hasta saturar', () => {
    let prev = -1
    for (let v = 0; v <= 8.3; v += 0.1) {
      const vrr = voltageRecruitment(v)
      expect(vrr).toBeGreaterThanOrEqual(prev)
      prev = vrr
    }
  })

  it('la fuerza pasiva es cero en o por debajo de la longitud de reposo', () => {
    expect(passiveForce(50)).toBe(0)
    expect(passiveForce(L_NOM)).toBe(0)
    expect(passiveForce(100)).toBe(1.75)
    expect(passiveForce(90)).toBeGreaterThan(passiveForce(80))
  })

  it('la escala activa es máxima a la longitud de reposo', () => {
    expect(activeScale(L_NOM)).toBe(1)
    expect(activeScale(50)).toBeCloseTo(1 - 0.0015 * 625)
    expect(activeScale(100)).toBeCloseTo(activeScale(50))
  })
})

describe('estímulo único', () => {
  it('0 V no produce fuerza activa', () => {
    const r = simulateTwitch({ voltage: 0, length: 75, tMax: 200, samples: 360 })
    expect(r.activeMax).toBe(0)
  })

  it('la fuerza activa máxima a 8.3 V y 75 mm es ≈1.82 g', () => {
    const r = simulateTwitch({ voltage: 8.3, length: 75, tMax: 200, samples: 360 })
    // pico analítico K1/e ≈ 1.823 g a t = latent + 1/K2
    expect(r.activeMax).toBeCloseTo(1.82, 1)
    expect(r.passive).toBe(0)
  })

  it('la fuerza activa es máxima a la longitud de reposo (isométrica)', () => {
    const at = (L: number): number =>
      simulateTwitch({ voltage: 8.2, length: L, tMax: 150, samples: 180 }).activeMax
    expect(at(75)).toBeGreaterThan(at(60))
    expect(at(75)).toBeGreaterThan(at(90))
  })
})

describe('estímulos múltiples', () => {
  it('un segundo estímulo antes de la relajación produce sumación', () => {
    const single = new MultipleStimulusSim({ voltage: 8.2, length: 75, tMax: 200 })
    runSingleSweep(single)
    const summed = new MultipleStimulusSim({ voltage: 8.2, length: 75, tMax: 200 })
    runSingleSweep(summed, [15])
    expect(summed.activeMax).toBeGreaterThan(single.activeMax * 1.2)
  })

  it('a mayor frecuencia de estímulos, mayor fuerza (hasta el tétanos)', () => {
    const peak = (rate: number): number => {
      const sim = new MultipleStimulusSim({ voltage: 8.2, length: 75, tMax: 200 })
      runTrain(sim, rate, 400)
      return sim.activeMax
    }
    const p20 = peak(20)
    const p80 = peak(80)
    const p130 = peak(130)
    expect(p80).toBeGreaterThan(p20)
    expect(p130).toBeGreaterThanOrEqual(p80)
    // nunca supera la fuerza tetánica máxima
    expect(p130).toBeLessThanOrEqual(6.8 * 1.05)
  })

  it('el tren se detiene y la fuerza vuelve a la basal', () => {
    const sim = new MultipleStimulusSim({ voltage: 8.2, length: 75, tMax: 200 })
    runTrain(sim, 50, 100)
    sim.toggleTrain(50)
    let steps = 0
    while (sim.mode !== 'idle' && steps < 10000) {
      sim.step()
      steps++
    }
    expect(sim.mode).toBe('idle')
  })
})

describe('contracción isotónica', () => {
  it('pesos mayores producen menor velocidad de acortamiento', () => {
    const v = (w: number): number =>
      simulateIsotonic({ voltage: 8.2, platformHeight: 75, weight: w, tMax: 200 }).velocityMax
    expect(v(0.5)).toBeGreaterThan(v(1))
    expect(v(1)).toBeGreaterThan(v(1.5))
  })

  it('la plataforma limita la longitud de reposo', () => {
    const r = simulateIsotonic({ voltage: 8.2, platformHeight: 75, weight: 1, tMax: 200 })
    expect(r.length).toBe(75)
    const free = simulateIsotonic({ voltage: 8.2, platformHeight: 100, weight: 1, tMax: 200 })
    expect(free.length).toBe(97)
  })

  it('la fuerza total nunca supera el peso mientras se levanta', () => {
    const r = simulateIsotonic({ voltage: 8.2, platformHeight: 75, weight: 1, tMax: 200 })
    for (const p of r.points) expect(p.force).toBeLessThanOrEqual(1 + 1e-9)
  })
})
