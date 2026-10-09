/**
 * Modelo de 11_AcidBase.swf. Los valores de pH, PCO₂, HCO₃⁻ y H⁺ salen de tablas del original;
 * el trazo es una sinusoide cuya amplitud y frecuencia cambian según la condición.
 * La pantalla mide 300 px (60 s) y avanza 2 "ticks" (0.1 s cada uno) por frame.
 */

export const TICKS = 600
const TICKS_PER_FRAME = 2

/** pH con el ruido del original: tabla − 0.02 + random(4)/100 */
export const noisyPh = (ph: number, random: () => number = Math.random): number =>
  Math.round((ph - 0.02 + Math.floor(random() * 4) / 100) * 100) / 100

export interface TracePoint {
  x: number
  y: number
}

/** El trazo de la pantalla: y en litros (base 2.67 l) contra segundos */
const toPoint = (tick: number, tOffset: number, y: number): TracePoint => ({
  x: (tick / 2 + tOffset) / 5,
  y: (80 - y) / 30
})

// ---------- Experimento 1: acidosis y alcalosis respiratorias ----------

const HYPER_PH = [7.42, 7.43, 7.45, 7.47, 7.49, 7.51, 7.52, 7.54, 7.56, 7.58, 7.59, 7.65, 7.67, 7.68, 7.7, 7.72, 7.74]
const HYPER_PCO2 = [38.5, 36.9, 35.3, 33.74, 32.18, 30.62, 29.06, 27.5, 25.94, 24.38, 22.82, 21.26, 19.7, 18.14, 16.58, 15.02, 15]
const REBREATH_PH = [7.4, 7.39, 7.38, 7.37, 7.36, 7.35, 7.34, 7.33, 7.32, 7.31, 7.3, 7.29, 7.28, 7.27, 7.26, 7.25, 7.24, 7.23]
const REBREATH_PCO2 = [40, 40.93, 41.86, 42.79, 43.72, 44.65, 45.58, 46.51, 47.44, 48.37, 49.3, 50.23, 51.16, 52.09, 53.02, 53.95, 54.88, 55.81]

export type RespCondition = 'normal' | 'hyperventilation' | 'rebreathing'
export type RespDisplay = RespCondition | 'returning'

const at = <T,>(list: T[], i: number): T => list[Math.max(0, Math.min(list.length - 1, i))]

export class RespiratoryRun {
  private readonly random: () => number
  tick = 0
  private tOffset = 0
  private amp = 10
  private readonly fq = 15
  private readonly sr = 5
  private peak = 0
  private hyper = false
  private rebreath = false
  private normal = false
  private normalBreath = false
  private hc = 0
  private rc = 0
  private np = 0
  private rb = 0
  private hyperStart = 0
  private hyperEnd = 0
  private hyperPeaks = 0
  private rebreathStart = 0
  private rebreathEnd = 0
  private rebreathPeaks = 0
  private normalPeaks = 0
  /** condición registrada (la última anormal aplicada) */
  condition: RespCondition = 'normal'
  display: RespDisplay = 'normal'
  pco2 = 40
  ph: number
  maxPco2 = 40
  minPco2 = 40
  maxPh: number
  minPh: number
  /** tamaño del pulmón para el dibujo (100 = reposo) */
  lungSize = 100
  done = false
  readonly points: TracePoint[] = []

  constructor(random: () => number = Math.random) {
    this.random = random
    this.ph = Math.round((7.38 + Math.floor(random() * 4) / 100) * 100) / 100
    this.maxPh = this.ph
    this.minPh = this.ph
  }

  get bagInflated(): boolean {
    return this.rebreath
  }

  hyperventilate(): void {
    this.condition = 'hyperventilation'
    this.display = 'hyperventilation'
    this.hyper = true
    this.peak = 0
  }

  rebreathe(): void {
    this.condition = 'rebreathing'
    this.display = 'rebreathing'
    this.rebreath = true
    this.peak = 0
  }

  normalBreathing(): void {
    this.display = 'returning'
    this.normal = true
    this.peak = 0
    this.hyper = false
    this.rebreath = false
  }

  /** se puede pedir respiración normal mientras dura una condición anormal */
  get abnormal(): boolean {
    return this.hyper || this.rebreath
  }

  stepFrame(): void {
    for (let i = 0; i < TICKS_PER_FRAME && !this.done; i++) this.tickOnce()
  }

  finish(): void {
    this.done = true
  }

  private setFrom(phList: number[], pcoList: number[], idx: number): void {
    this.pco2 = at(pcoList, idx)
    this.ph = noisyPh(at(phList, idx), this.random)
  }

  private tickOnce(): void {
    if (this.tick + this.tOffset * 2 >= TICKS) {
      this.done = true
      return
    }
    if (this.rebreath) {
      if (this.peak >= 1) {
        this.rc++
        if (this.rc < 200) {
          this.tOffset -= 0.01
          this.amp += 0.05
        }
        this.rebreathEnd = this.tick
        this.rebreathPeaks = Math.floor(this.peak / 2) - 1
        this.setFrom(REBREATH_PH, REBREATH_PCO2, Math.max(0, this.rebreathPeaks))
      } else {
        this.rebreathStart = this.tick
        this.rc = 0
      }
    }
    if (this.hyper) {
      if (this.peak >= 1) {
        this.hc++
        if (this.hc < 20) {
          this.tOffset -= 0.05
          this.amp += 2
        }
        this.hyperEnd = this.tick
        this.hyperPeaks = Math.floor(this.peak / 2) - 1
        this.setFrom(HYPER_PH, HYPER_PCO2, Math.max(0, this.hyperPeaks))
      } else {
        this.hyperStart = this.tick
        this.hc = 0
      }
    }
    if (this.normal) {
      if (this.condition === 'hyperventilation') {
        if (this.amp > 0) this.amp -= 1
        const npTime = Math.floor((this.hyperEnd - this.hyperStart) / Math.max(1, this.hyperPeaks))
        this.np++
        if (this.np === Math.floor(npTime * 1.3)) {
          this.np = 0
          this.normalPeaks--
          this.setFrom(HYPER_PH, HYPER_PCO2, this.hyperPeaks + this.normalPeaks)
        }
        if (this.hyperPeaks + this.normalPeaks <= 0) {
          this.normal = false
          this.normalBreath = true
        }
      } else if (this.condition === 'rebreathing') {
        if (this.amp > 10) this.amp -= 0.05
        const rbTime = Math.floor((this.rebreathEnd - this.rebreathStart) / Math.max(1, this.rebreathPeaks))
        this.rb++
        if (this.rb === Math.floor(rbTime * 1.3)) {
          this.rb = 0
          this.normalPeaks--
          this.setFrom(REBREATH_PH, REBREATH_PCO2, this.rebreathPeaks + this.normalPeaks)
        }
        if (this.rebreathPeaks + this.normalPeaks <= 0) {
          this.display = 'normal'
          this.normal = false
          this.normalBreath = true
        }
      } else {
        this.normal = false
      }
    }
    if (this.normalBreath) {
      if (this.amp < 10) this.amp += 0.3
      else {
        this.pco2 = REBREATH_PCO2[0]
        this.ph = noisyPh(REBREATH_PH[0], this.random)
        this.display = 'normal'
      }
    }
    this.tick++
    const y = this.amp * Math.sin(2 * Math.PI * (this.fq / 120) / this.sr * this.tick)
    this.points.push(toPoint(this.tick, this.tOffset, y))
    this.lungSize = 100 + y / 2
    if (this.lungSize > 99 && this.lungSize < 101) this.peak++
    this.maxPco2 = Math.max(this.maxPco2, this.pco2)
    this.minPco2 = Math.min(this.minPco2, this.pco2)
    this.maxPh = Math.max(this.maxPh, this.ph)
    this.minPh = Math.min(this.minPh, this.ph)
  }
}

// ---------- Experimento 2: acidosis y alcalosis metabólicas ----------

export const METABOLIC = {
  rate: [20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80],
  bpm: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21],
  ph: [7.51, 7.49, 7.47, 7.45, 7.44, 7.42, 7.4, 7.38, 7.35, 7.3, 7.27, 7.25, 7.25],
  pco2: [31, 32.5, 34, 35.5, 37, 38.5, 40, 43, 45, 48, 52, 54, 55],
  hco3: [30, 29, 28, 27, 26, 25, 24, 22, 20, 18, 16, 15, 14.5],
  h: [32, 33, 34, 36, 38, 39, 40, 44, 47, 50, 55, 59, 63]
}
export const METABOLIC_DEFAULT = 6

export interface MetabolicResult {
  rate: number
  bpm: number
  ph: number
  pco2: number
  h: number
  hco3: number
}

export class MetabolicRun {
  readonly index: number
  private readonly random: () => number
  tick = 0
  private tOffset = 0
  private mul = 0
  private amp = 10
  private fq = 15
  private readonly sr = 5
  private readonly endAmp: number
  private readonly endBpm: number
  lungSize = 100
  /** latidos del corazón (para la animación) */
  beat = 0
  done = false
  readonly points: TracePoint[] = []

  constructor(index: number, random: () => number = Math.random) {
    this.index = index
    this.random = random
    this.endAmp = METABOLIC.rate[index] - 40
    this.endBpm = METABOLIC.bpm[index]
  }

  stepFrame(): void {
    for (let i = 0; i < TICKS_PER_FRAME && !this.done; i++) this.tickOnce()
  }

  finish(): void {
    this.done = true
  }

  /** valores de la tabla al terminar (f_setValues) */
  result(): MetabolicResult {
    const i = this.index
    return {
      rate: METABOLIC.rate[i],
      bpm: METABOLIC.bpm[i],
      ph: noisyPh(METABOLIC.ph[i], this.random),
      pco2: METABOLIC.pco2[i],
      h: METABOLIC.h[i],
      hco3: METABOLIC.hco3[i]
    }
  }

  private tickOnce(): void {
    if (this.tick + this.tOffset * 2 >= TICKS) {
      this.done = true
      return
    }
    const rate = METABOLIC.rate[this.index]
    if (rate <= 50) {
      if (this.tick > 100) {
        if (this.tick < 200) this.mul += (1 - rate / 50) / 100
        this.tOffset += this.mul
      } else {
        this.tOffset += this.mul
        this.mul = 0
      }
    } else if (this.tick > 100) {
      if (this.fq < this.endBpm) this.fq += 0.05
      if (this.amp < this.endAmp) this.amp += 0.2
    } else {
      this.tOffset = 0
      this.mul = 0
    }
    this.tick++
    const y = this.amp * Math.sin(2 * Math.PI * (this.fq / 120) / this.sr * this.tick)
    this.points.push(toPoint(this.tick, this.tOffset, y))
    this.lungSize = 100 + y / 2
    if (this.lungSize > 98 && this.lungSize < 102) this.beat++
  }
}

// ---------- Experimento 3: compensación renal ----------

export type Level = 'decreased' | 'normal' | 'elevated'

export const RENAL = {
  pco2: [20, 30, 35, 40, 50, 60, 75, 90],
  ph: [7.7, 7.6, 7.5, 7.4, 7.35, 7.3, 7.2, 7.1],
  h: ['decreased', 'decreased', 'normal', 'normal', 'normal', 'elevated', 'elevated', 'elevated'] as Level[],
  hco3: ['elevated', 'elevated', 'normal', 'normal', 'normal', 'decreased', 'decreased', 'decreased'] as Level[]
}
export const RENAL_DEFAULT = 3
