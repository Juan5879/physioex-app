import { describe, expect, it } from 'vitest'
import {
  addReagent,
  benedictResult,
  emptyTube,
  finalPh,
  ikiResult,
  incubate,
  opticalDensity,
  type DigestExperiment,
  type Tube
} from './digestion'

function tube(exp: DigestExperiment, ...names: string[]): Tube {
  let t = emptyTube()
  for (const n of names) {
    const r = addReagent(exp, t, n)
    if (!r.ok) throw new Error(`${n}: ${r.reason}`)
    t = r.tube
  }
  return t
}

describe('amilasa', () => {
  it('a 37 °C y pH 7 digiere el almidón', () => {
    const t = incubate('am', tube('am', 'amylase', 'starch', 'ph7'), 37, 60)
    expect(ikiResult(t)).toBe('-')
    expect(benedictResult(t)).toBe('+')
  })

  it('hervida no actúa', () => {
    const t = incubate('am', { ...tube('am', 'amylase', 'starch', 'ph7'), boiled: true }, 37, 60)
    expect(ikiResult(t)).toBe('+')
    expect(benedictResult(t)).toBe('-')
  })

  it('no digiere la celulosa; las bacterias sí, en 30 min a 37 °C y pH 7', () => {
    expect(benedictResult(incubate('am', tube('am', 'amylase', 'cellulose', 'ph7'), 37, 60))).toBe('-')
    const b = incubate('am', tube('am', 'bacteria', 'cellulose', 'ph7'), 37, 60)
    expect(b.concProduct).toBe(5)
    expect(b.concSubstrate).toBe(0)
  })

  it('a 70 °C la enzima se desnaturaliza', () => {
    expect(benedictResult(incubate('am', tube('am', 'amylase', 'starch', 'ph7'), 70, 60))).toBe('-')
  })

  it('el control con maltosa da Benedict positivo', () => {
    expect(benedictResult(incubate('am', tube('am', 'water', 'maltose', 'ph7'), 37, 60))).toBe('+')
  })

  it('no admite dos tampones ni más de 3 reactivos', () => {
    const t = tube('am', 'amylase', 'starch', 'ph7')
    expect(addReagent('am', tube('am', 'ph7'), 'ph2')).toMatchObject({ ok: false, reason: 'bufferPresent' })
    expect(addReagent('am', t, 'water')).toMatchObject({ ok: false, reason: 'full' })
  })
})

describe('pepsina y lipasa', () => {
  it('la pepsina funciona a pH 2 y casi nada a pH 7', () => {
    const acid = opticalDensity(incubate('pe', tube('pe', 'pepsin', 'bapna', 'ph2'), 37, 60))
    const neutral = opticalDensity(incubate('pe', tube('pe', 'pepsin', 'bapna', 'ph7'), 37, 60))
    expect(acid).toBeGreaterThan(0.3)
    expect(neutral).toBeLessThan(acid / 2)
  })

  it('la lipasa con sales biliares baja más el pH', () => {
    const bile = finalPh(incubate('li', tube('li', 'lipase', 'oil', 'bile', 'ph7'), 37, 60))
    const noBile = finalPh(incubate('li', tube('li', 'lipase', 'oil', 'water', 'ph7'), 37, 60))
    expect(bile).toBeLessThan(noBile)
    expect(bile).toBeLessThan(7)
  })
})
