import { describe, expect, it } from 'vitest'
import { FrogHeart, type HeartPhase } from './heart'

/** generador pseudoaleatorio determinista para que las pruebas no dependan del azar */
function seeded(seed = 1): () => number {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

const FRAMES_PER_SEC = 20

function run(h: FrogHeart, seconds: number, onFrame?: () => void): HeartPhase[] {
  const phases: HeartPhase[] = []
  for (let i = 0; i < seconds * FRAMES_PER_SEC; i++) {
    h.stepFrame()
    phases.push(h.phase)
    onFrame?.()
  }
  return phases
}

describe('corazón de rana', () => {
  it('late cerca de su frecuencia normal (59–62 lpm) y la reporta', () => {
    const h = new FrogHeart('es', seeded(3))
    expect(h.rNom).toBeGreaterThanOrEqual(59)
    expect(h.rNom).toBeLessThanOrEqual(62)
    run(h, 30)
    expect(h.displayedRate).toBe(Math.round(h.rNom))
    expect(h.status).toBe('normal')
  })

  it('la curva sube en la contracción ventricular hasta ~4', () => {
    const h = new FrogHeart('es', seeded(5))
    let max = 0
    run(h, 10, () => {
      for (const p of h.points) max = Math.max(max, p.y)
    })
    expect(max).toBeGreaterThan(3.5)
    expect(max).toBeLessThan(4.5)
  })

  it('la pilocarpina baja la frecuencia a ~75 %', () => {
    const h = new FrogHeart('mr', seeded(7))
    run(h, 10)
    h.applyDrug('Pilo')
    expect(h.targetRateRounded).toBe(Math.round(h.rNom * 0.75))
    run(h, 60)
    expect(h.displayedRate).toBeCloseTo(h.rNom * 0.75, -1)
    expect(h.status).toBe('stable')
    expect(h.ringerButtons).toBe('room')
  })

  it('un estímulo en la latencia produce una extrasístole', () => {
    const h = new FrogHeart('es', seeded(11))
    let stimulated = false
    const phases = run(h, 10, () => {
      if (!stimulated && h.phase === 'L') {
        h.singleStimulus()
        stimulated = true
      }
    })
    expect(phases).toContain('ESC')
    expect(phases).toContain('CP')
  })

  it('la estimulación vagal intensa detiene el corazón y luego escapa', () => {
    const h = new FrogHeart('es', seeded(13))
    run(h, 5)
    h.vagusOn(50)
    const phases = run(h, 60)
    expect(phases).toContain('VL')
    expect(phases.lastIndexOf('AC')).toBeGreaterThan(phases.indexOf('VL'))
  })
})
