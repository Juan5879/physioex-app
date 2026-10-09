import { describe, expect, it } from 'vitest'
import { carrierDiffusion, osmoticPressure, simpleDiffusion, TransportRun, type TransportSetup } from './transport'
import { filtration, residuePresent } from './filtration'

function run(setup: Partial<TransportSetup> & Pick<TransportSetup, 'experiment'>): TransportRun {
  const r = new TransportRun({
    left: {},
    right: {},
    startLeft: setup.left ?? {},
    startRight: setup.right ?? {},
    maxTime: 60,
    ...setup
  })
  while (r.tick());
  return r
}

describe('difusión simple', () => {
  it('cada paso mueve rate·30 mM hacia el lado de menor concentración', () => {
    const r = simpleDiffusion(9, 0, 0.01)
    expect(r.rate).toBeCloseTo(0.09, 10)
    expect(r.left).toBeCloseTo(9 - 2.7, 10)
    expect(r.right).toBeCloseTo(2.7, 10)
  })

  it('el NaCl pasa por la membrana de 50 MWCO y llega al equilibrio', () => {
    const r = run({ experiment: 'sd', mwco: 50, left: { NaCl: 9 }, right: {} })
    expect(r.eqlm.NaCl).toBeGreaterThan(0)
    expect(r.left.NaCl).toBeCloseTo(4.5, 3)
    expect(r.right.NaCl).toBeCloseTo(4.5, 3)
    expect(r.avRate.NaCl).toBeGreaterThan(0)
    expect(r.outcomes()).toEqual([{ solute: 'NaCl', kind: 'equilibrium', time: r.eqlm.NaCl }])
  })

  it('la membrana de 20 MWCO no deja pasar nada y la albúmina nunca difunde', () => {
    const r = run({ experiment: 'sd', mwco: 20, left: { NaCl: 9, Albu: 9 }, right: {} })
    expect(r.left.NaCl).toBe(9)
    expect(r.avRate.NaCl).toBe(0)
    const r2 = run({ experiment: 'sd', mwco: 200, left: { Albu: 9 }, right: {} })
    expect(r2.left.Albu).toBe(9)
    expect(r2.outcomes()).toEqual([{ solute: 'Albu', kind: 'noDiffusion' }])
  })

  it('la glucosa necesita 200 MWCO', () => {
    expect(run({ experiment: 'sd', mwco: 100, left: { Gluc: 9 } }).avRate.Gluc).toBe(0)
    expect(run({ experiment: 'sd', mwco: 200, left: { Gluc: 9 } }).avRate.Gluc).toBeGreaterThan(0)
  })
})

describe('difusión facilitada', () => {
  it('la velocidad es proporcional a los transportadores y se satura en 6 mM', () => {
    const half = carrierDiffusion(2, 0, 500).rate
    expect(carrierDiffusion(2, 0, 1000).rate).toBeCloseTo(half * 2, 10)
    expect(carrierDiffusion(20, 0, 500).rate).toBe(carrierDiffusion(6, 0, 500).rate)
  })

  it('más transportadores dan mayor velocidad media', () => {
    const a = run({ experiment: 'fd', carriers: 100, left: { Gluc: 8 } }).avRate.Gluc ?? 0
    const b = run({ experiment: 'fd', carriers: 700, left: { Gluc: 8 } }).avRate.Gluc ?? 0
    expect(b).toBeGreaterThan(a)
  })

  it('sin transportadores la glucosa no pasa', () => {
    const r = run({ experiment: 'fd', carriers: 0, left: { Gluc: 8, NaCl: 8 } })
    expect(r.left.Gluc).toBe(8)
    expect(r.avRate.NaCl).toBeGreaterThan(0)
  })
})

describe('ósmosis', () => {
  it('9 mM de albúmina generan 153 mm Hg a los 12 minutos', () => {
    expect(osmoticPressure({ Albu: 9 }, {}, { NaCl: 0.01, Gluc: 0 }, 12)).toEqual({
      left: 153,
      right: 0,
      timeToEquilibrium: 12
    })
    expect(osmoticPressure({ Albu: 9 }, {}, { NaCl: 0.01, Gluc: 0 }, 6).left).toBe(77)
    expect(osmoticPressure({}, { Albu: 9 }, { NaCl: 0.01, Gluc: 0 }, 30).right).toBe(153)
  })

  it('el NaCl que no atraviesa la membrana cuenta doble (Na+ y Cl−)', () => {
    expect(osmoticPressure({ NaCl: 9 }, {}, { NaCl: 0, Gluc: 0 }, 12).left).toBe(306)
  })

  it('registra el equilibrio osmótico', () => {
    const r = run({ experiment: 'os', mwco: 20, left: { Albu: 9 }, right: {} })
    expect(r.presL).toBe(153)
    expect(r.osmoticEquilibrium()).toBe(true)
  })
})

describe('transporte activo', () => {
  it('la bomba mueve Na+ y K+ en proporción 3:2 y gasta ATP', () => {
    const r = new TransportRun({
      experiment: 'at',
      left: { Napl: 9 },
      right: { Kplu: 6 },
      startLeft: { Napl: 9 },
      startRight: { Kplu: 6 },
      maxTime: 60,
      pumps: 500,
      atp: 1
    })
    r.tick()
    const naMoved = 9 - (r.left.Napl ?? 0)
    const kMoved = 6 - (r.right.Kplu ?? 0)
    expect(naMoved / kMoved).toBeCloseTo(1.5, 10)
    expect(r.right.Napl).toBeCloseTo(naMoved, 10)
    expect(r.atp).toBeLessThan(1)
  })

  it('sin ATP no hay transporte', () => {
    const r = run({ experiment: 'at', left: { Napl: 9 }, right: { Kplu: 6 }, pumps: 500, atp: 0 })
    expect(r.left.Napl).toBe(9)
    expect(r.outcomes().map((o) => o.kind)).toEqual(['noTransport', 'noTransport'])
  })
})

describe('filtración', () => {
  it('velocidad = presión·MWCO·0.001 y el filtrado depende del poro', () => {
    const r = filtration(50, 200, { NaCl: 5, Urea: 5, Gluc: 5, PoCh: 5 })
    expect(r.rate).toBeCloseTo(10, 10)
    expect(r.timeRequired).toBeCloseTo(10, 10)
    expect(r.filtrate.NaCl).toBeCloseTo(4.81, 10)
    expect(r.filtrate.Gluc).toBeCloseTo(4.395, 10)
    expect(r.filtrate.PoCh).toBe(0)
    const small = filtration(50, 50, { NaCl: 5, Urea: 5, Gluc: 5 })
    expect(small.filtrate.Urea).toBe(0)
    expect(small.filtrate.Gluc).toBe(0)
    expect(small.filtrate.NaCl).toBeGreaterThan(0)
  })

  it('el residuo indica los solutos que había en el vaso', () => {
    expect(residuePresent({ PoCh: 5 }, 'PoCh')).toBe(true)
    expect(residuePresent({ PoCh: 0 }, 'PoCh')).toBe(false)
  })
})
