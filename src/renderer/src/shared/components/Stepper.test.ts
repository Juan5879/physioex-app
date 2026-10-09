import { describe, expect, it } from 'vitest'
import { snapToStep } from './Stepper'

describe('valor escrito en un control', () => {
  it('se ajusta al paso contado desde el mínimo', () => {
    expect(snapToStep(3.14, { min: 0, max: 10, step: 0.1 })).toBe(3.1)
    expect(snapToStep(62, { min: 5, max: 300, step: 5 })).toBe(60)
    expect(snapToStep(437, { min: 0, max: 1000, step: 50 })).toBe(450)
  })

  it('se limita al rango', () => {
    expect(snapToStep(-3, { min: 0, max: 20, step: 1 })).toBe(0)
    expect(snapToStep(999, { min: 50, max: 100, step: 1 })).toBe(100)
  })
})
