import { describe, expect, it } from 'vitest'
import { glomerularFiltration, segmentConcentration, urineConcentration, urineFormation } from './renal'

describe('filtración glomerular', () => {
  it('valores iniciales: presión glomerular entre la capsular y la arterial', () => {
    const r = glomerularFiltration(0.5, 0.45, 90, true)
    expect(r.glomerularPressure).toBeGreaterThan(45)
    expect(r.glomerularPressure).toBeLessThan(90)
    expect(r.gfr).toBeGreaterThan(0)
    expect(r.urineVolume).toBeGreaterThan(0)
  })

  it('cerrar la aferente baja la filtración; cerrar la eferente la sube', () => {
    const base = glomerularFiltration(0.5, 0.45, 90, true).gfr
    expect(glomerularFiltration(0.4, 0.45, 90, true).gfr).toBeLessThan(base)
    expect(glomerularFiltration(0.5, 0.35, 90, true).gfr).toBeGreaterThan(base)
  })

  it('más presión, más filtración; con la válvula cerrada no hay orina', () => {
    expect(glomerularFiltration(0.5, 0.45, 100, true).gfr).toBeGreaterThan(glomerularFiltration(0.5, 0.45, 70, true).gfr)
    const closed = glomerularFiltration(0.5, 0.45, 90, false)
    expect(closed.gfr).toBe(0)
    expect(closed.urineVolume).toBe(0)
  })
})

describe('formación de orina', () => {
  it('sin transportadores toda la glucosa queda en la orina; con 350 o más, nada', () => {
    const base = { gradient: 300, adh: false, aldosterone: false, valveOpen: true }
    expect(urineFormation({ ...base, carriers: 0 }).glucose).toBe(6)
    expect(urineFormation({ ...base, carriers: 350 }).glucose).toBe(0)
    expect(urineFormation({ ...base, carriers: 500 }).glucose).toBe(0)
  })

  it('la ADH concentra la orina y reduce su volumen', () => {
    const base = { carriers: 0, gradient: 1200, aldosterone: false, valveOpen: true }
    const no = urineFormation({ ...base, adh: false })
    const yes = urineFormation({ ...base, adh: true })
    expect(yes.urineVolume).toBeLessThan(no.urineVolume)
    expect(urineConcentration(true, yes.urineVolume, 1200)).toBe(1200)
    expect(urineConcentration(false, no.urineVolume, 1200)).toBe(100)
  })

  it('la aldosterona aumenta la concentración de potasio', () => {
    const base = { carriers: 0, gradient: 300, adh: false, valveOpen: true }
    expect(urineFormation({ ...base, aldosterone: true }).potassium).toBeGreaterThan(
      urineFormation({ ...base, aldosterone: false }).potassium
    )
  })

  it('la sonda mide el gradiente en el asa descendente', () => {
    expect(segmentConcentration('descending', 0, 1200, false, 100)).toBe(300)
    expect(segmentConcentration('descending', 1, 1200, false, 100)).toBe(1200)
    expect(segmentConcentration('collecting', 1, 1200, false, 100)).toBe(100)
  })
})
