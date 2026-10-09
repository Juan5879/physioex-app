import { describe, expect, it } from 'vitest'
import {
  ELECTRIC,
  GOMPERTZ,
  NERVE_PARAMS,
  REST,
  actionPotential,
  conductionVelocity,
  isStimulusPixel,
  singleStimulus,
  stimulusAmplitude
} from './nerve'

describe('curva del potencial de acción', () => {
  it('empieza y termina en el valor de reposo', () => {
    expect(GOMPERTZ[0]).toBeCloseTo(REST, 6)
    expect(GOMPERTZ[539]).toBeCloseTo(REST, 2)
    expect(Math.max(...GOMPERTZ)).toBeCloseTo(1, 2)
  })

  it('el pico llega más tarde cuanto mayor es el retardo', () => {
    const peak = (delay: number): number => {
      const pts = actionPotential(45, delay)
      return pts.reduce((best, p) => (p.y > best.y ? p : best)).x
    }
    expect(peak(NERVE_PARAMS.worm.tDelay)).toBeGreaterThan(peak(NERVE_PARAMS.rat2.tDelay))
    expect(peak(4.5) - peak(0.5)).toBeCloseTo(4, 1)
  })
})

describe('estímulo eléctrico', () => {
  it('umbral de 3 V y amplitud máxima a 4 V', () => {
    expect(stimulusAmplitude(2.9, ELECTRIC).fires).toBe(false)
    expect(stimulusAmplitude(3, ELECTRIC)).toEqual({ fires: true, amp: 40 })
    expect(stimulusAmplitude(3.5, ELECTRIC).amp).toBeCloseTo(42.5, 10)
    expect(stimulusAmplitude(8, ELECTRIC).amp).toBe(45)
  })

  it('bajo el umbral o bloqueado da una línea plana en reposo', () => {
    const sub = singleStimulus(1, ELECTRIC)
    expect(sub.actionPotential).toBe(false)
    expect(sub.points.every((p) => p.y === 40 * REST)).toBe(true)
    const blocked = singleStimulus(5, ELECTRIC, true)
    expect(blocked.actionPotential).toBe(false)
    expect(blocked.points[0].y).toBeCloseTo(45 * REST, 10)
  })
})

describe('estímulos repetidos', () => {
  it('marca un estímulo al inicio de cada periodo', () => {
    const marks = Array.from({ length: 108 }, (_, i) => i).filter((i) => isStimulusPixel(i, 36))
    expect(marks).toEqual([0, 36, 72])
    const fast = Array.from({ length: 36 }, (_, i) => i).filter((i) => isStimulusPixel(i, 36 / 5))
    expect(fast).toHaveLength(5)
  })
})

describe('velocidad de conducción', () => {
  it('43 mm / tiempo en ms', () => {
    expect(conductionVelocity(2)).toBe(21.5)
    expect(conductionVelocity(0)).toBeNull()
  })
})
