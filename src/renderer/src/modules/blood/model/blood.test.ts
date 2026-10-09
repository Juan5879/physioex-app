import { describe, expect, it } from 'vitest'
import { CHOLESTEROL, HEMATOCRIT, HB_SAMPLE_GREEN, HEMOGLOBIN, TYPING, bloodType, esrDistance, hbGreen, hematocrit } from './blood'

describe('análisis de sangre', () => {
  it('hematocrito = capa de glóbulos rojos / altura total', () => {
    expect(hematocrit(HEMATOCRIT[0])).toBe(48)
    expect(hematocrit(HEMATOCRIT[4])).toBe(19)
  })

  it('la sedimentación avanza con el tiempo hasta la distancia de 60 min', () => {
    expect(esrDistance(4, 60)).toBe(40)
    expect(esrDistance(4, 30)).toBe(20)
    expect(esrDistance(2, 60)).toBe(0)
  })

  it('el color del patrón coincide aproximadamente con el de cada muestra', () => {
    HEMOGLOBIN.forEach((s, i) => expect(Math.abs(hbGreen(s.hb) - HB_SAMPLE_GREEN[i])).toBeLessThan(15))
  })

  it('grupos sanguíneos de las seis muestras', () => {
    expect(TYPING.map(bloodType)).toEqual(['A+', 'B+', 'AB−', 'O−', 'AB+', 'B−'])
  })

  it('colesterol de los pacientes', () => {
    expect(CHOLESTEROL).toEqual([150, 300, 150, 225])
  })
})
