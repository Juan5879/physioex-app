/**
 * Modelo de 06_Respiratory.swf. Los tres experimentos integran el volumen pulmonar frame a frame
 * con un flujo proporcional a r⁴ y a la presión (sinusoidal) generada por la campana.
 * La pantalla muestra litros (0–6) contra segundos (0–60).
 */

export const T_MAX = 60
export const V_MAX = 6
export const RADIUS = { min: 3, max: 5, step: 0.1 }
export const PUMP_RATE = { min: 5, max: 25, step: 1, initial: 15 }

export interface VolumePoint {
  x: number
  y: number
}

const rad = (deg: number): number => 0.017453292519943295 * deg
const r2 = (v: number): number => Math.round(v * 100) / 100

// ---------- Experimento 1: volúmenes respiratorios ----------

export interface VolumeResults {
  tidal: number | null
  expReserve: number | null
  inspReserve: number | null
  residual: number | null
  vitalCapacity: number | null
  fev1: number | null
  totalLungCapacity: number | null
  pumpRate: number | null
}

/** rvDoCalc del original: 2 normal, 3/4 ERV (espera/ejecuta), 5/6 FVC, 1 terminando */
type VolumesMode = 'normal' | 'ervWait' | 'erv' | 'fvcWait' | 'fvc'

export class VolumesRun {
  readonly radius: number
  /** 15 frames por respiración a 15 respiraciones/min */
  private readonly tInc = 60 / 15 / 15
  t = 0
  mode: VolumesMode = 'normal'
  done = false
  private tStartDegs = 0
  lv = 2400
  private lvLow = 10000
  private lvHigh = 0
  private lvForcedHigh = 0
  private lvForcedLow = 10000
  private piLv = 2400
  private piLvForcedLow = 10000
  private piLvForcedHigh = 0
  private dataTv = 0
  flow = 0
  totalFlow = 0
  lungScale = 100
  readonly points: VolumePoint[] = []
  results: VolumeResults = {
    tidal: null,
    expReserve: null,
    inspReserve: null,
    residual: null,
    vitalCapacity: null,
    fev1: null,
    totalLungCapacity: null,
    pumpRate: null
  }

  constructor(radius: number) {
    this.radius = radius
  }

  /** "ERV" y "FVC" esperan al inicio de la siguiente respiración */
  get canForce(): boolean {
    return !this.done && this.mode === 'normal'
  }

  requestERV(): void {
    if (this.canForce) this.mode = 'ervWait'
  }

  requestFVC(): void {
    if (this.canForce) this.mode = 'fvcWait'
  }

  /** "Detener" o fin del tiempo */
  finish(): void {
    if (this.done) return
    this.done = true
    if (this.results.tidal === null) this.results.tidal = Math.floor(this.dataTv)
    this.results.pumpRate = 15
    this.flow = 0
  }

  step(): void {
    if (this.done) return
    if (this.t >= T_MAX) {
      this.finish()
      return
    }
    this.t += this.tInc
    const degs = this.t * (360 / (60 / 15))
    const sinv = Math.sin(rad(degs + 180))
    let pressure = Math.round(sinv * 100) / 100
    const mod = degs % 360
    const atBreathStart = (350 < mod && mod <= 360) || (0 < mod && mod < 10)

    if (this.mode === 'erv') {
      const d = degs - this.tStartDegs
      if (d < 180) pressure = Math.round(sinv * 100) / 100
      else if (d < 540) pressure = Math.round(sinv * 340) / 100
      else if (d < 720) pressure = Math.round(sinv * 100) / 100
      else {
        this.results.tidal = Math.round(this.lvHigh - this.lvLow)
        this.results.expReserve = Math.round(this.lvLow - this.lvForcedLow)
        this.results.residual = Math.round(this.lvForcedLow)
        this.results.pumpRate = 15
        this.mode = 'normal'
      }
    }
    if (this.mode === 'ervWait' && atBreathStart) {
      this.mode = 'erv'
      this.tStartDegs = degs
    }
    if (this.mode === 'fvc') {
      const d = degs - this.tStartDegs
      if (d < 180) pressure = Math.round(sinv * 719) / 100
      else if (d < 360) pressure = Math.round(sinv * 959) / 100
      else if (d < 540) pressure = Math.round(sinv * 405) / 100
      else if (d < 720) pressure = Math.round(sinv * 165) / 100
      else {
        const tv = this.lvHigh - this.lvLow
        const erv = this.lvLow - this.lvForcedLow
        const irv = this.lvForcedHigh - this.lvHigh
        const rv = this.lvForcedLow
        const vc = tv + erv + irv
        const fev = 0.8 * vc
        // el FEV1 se escala con la capacidad vital de un tubo 0.1 mm más ancho (piLV)
        const vcBase = this.piLvForcedHigh - this.piLvForcedLow
        this.results = {
          tidal: Math.round(tv),
          expReserve: Math.round(erv),
          inspReserve: Math.round(irv),
          residual: Math.round(rv),
          vitalCapacity: Math.round(vc),
          fev1: Math.round((vc / vcBase) * fev),
          totalLungCapacity: Math.round(vc + rv),
          pumpRate: 15
        }
        this.mode = 'normal'
      }
    }
    if (this.mode === 'fvcWait' && atBreathStart) {
      this.tStartDegs = degs
      this.mode = 'fvc'
    }

    this.flow = -0.168 * Math.pow(this.radius, 4) * pressure
    this.lv += this.flow
    this.lungScale += this.flow / 50
    const piFlow = -0.168 * Math.pow(this.radius + 0.1, 4) * pressure
    this.piLv += piFlow
    if (this.flow >= 0) this.totalFlow += Math.round(this.flow)
    this.points.push({ x: this.t, y: this.lv / 1000 })

    if (this.mode === 'normal') {
      this.lvHigh = Math.max(this.lvHigh, this.lv)
      this.lvLow = Math.min(this.lvLow, this.lv)
      this.dataTv = this.lvHigh - this.lvLow
      this.piLvForcedHigh = Math.max(this.piLvForcedHigh, this.piLv)
    } else if (this.mode === 'fvcWait' || this.mode === 'fvc') {
      this.lvForcedHigh = Math.max(this.lvForcedHigh, this.lv)
      this.piLvForcedHigh = Math.max(this.piLvForcedHigh, this.piLv)
      this.lvForcedLow = Math.min(this.lvForcedLow, this.lv)
      this.piLvForcedLow = Math.min(this.piLvForcedLow, this.piLv)
    } else {
      this.lvForcedLow = Math.min(this.lvForcedLow, this.lv)
      this.piLvForcedLow = Math.min(this.piLvForcedLow, this.piLv)
    }
  }
}

// ---------- Experimento 2: factores que afectan la respiración ----------

export interface FactorsResults {
  pressureL: number
  pressureR: number
  flowL: number
  flowR: number
  totalFlow: number
}

/** Estado de los pulmones que persiste entre corridas: válvulas (neumotórax) y surfactante */
export interface Lungs {
  deflatedL: boolean
  deflatedR: boolean
  volL: number
  volR: number
  /** el trazo cae o sube de a 80 ml por frame al desinflar o reinflar un pulmón */
  deflateFactor: number
  inflateFactor: number
}

export const newLungs = (): Lungs => ({
  deflatedL: false,
  deflatedR: false,
  volL: 1250,
  volR: 1250,
  deflateFactor: 0,
  inflateFactor: 0
})

/** Abrir una válvula colapsa ese pulmón (el original lo hacía al final de la animación) */
export function deflate(l: Lungs, side: 'L' | 'R'): Lungs {
  if (side === 'L' ? l.deflatedL : l.deflatedR) return l
  return side === 'L'
    ? { ...l, deflatedL: true, deflateFactor: l.deflateFactor + l.volL }
    : { ...l, deflatedR: true, deflateFactor: l.deflateFactor + l.volR }
}

/** "Reset": reinfla los pulmones colapsados cuya válvula está cerrada */
export function reinflate(l: Lungs, valveL: boolean, valveR: boolean): Lungs {
  let n = { ...l }
  if (n.deflatedL && !valveL) n = { ...n, deflatedL: false, inflateFactor: n.inflateFactor + n.volL }
  if (n.deflatedR && !valveR) n = { ...n, deflatedR: false, inflateFactor: n.inflateFactor + n.volR }
  return n
}

export class FactorsRun {
  readonly radius: number
  readonly pumpRate: number
  /** surfactante: 5 (normal) a 10 */
  readonly surfactant: number
  lungs: Lungs
  t = 0
  done = false
  pressL = 0
  pressR = 0
  /** valores por ciclo mostrados durante la corrida */
  cycleFlowL: number | null = null
  cycleFlowR: number | null = null
  private maxFlowL = 0
  private maxFlowR = 0
  private maxPressL = 0
  private maxPressR = 0
  private sumFlowL = 0
  private sumFlowR = 0
  private cycles = 0
  private maxCalced = false
  lungScale = 100
  readonly points: VolumePoint[] = []
  results: FactorsResults | null = null

  constructor(radius: number, pumpRate: number, surfactant: number, lungs: Lungs) {
    this.radius = radius
    this.pumpRate = pumpRate
    this.surfactant = surfactant
    this.lungs = { ...lungs, volL: 1250, volR: 1250 }
  }

  step(): void {
    if (this.done) return
    if (this.t >= T_MAX) {
      this.finish()
      return
    }
    this.t += 0.25
    const degs = this.t * (360 / (60 / this.pumpRate))
    const pressure = Math.round(1.06 * Math.sin(rad(degs + 180)) * 100) / 100
    const l = this.lungs
    this.pressL = l.deflatedL ? 0 : pressure / 2
    this.pressR = l.deflatedR ? 0 : pressure / 2
    const k = -0.15 * Math.pow(this.radius, 4) * (this.surfactant / 5)
    const flow = k * pressure
    const flowL = k * this.pressL
    const flowR = k * this.pressR
    this.lungScale += 0.8 * (flow / (44 + Math.sqrt(Math.max(0.01, Math.abs(flow)))))
    l.volL += flow / 2
    l.volR += flow / 2

    const mod = degs % 360
    if (300 < mod && mod <= 360) {
      if (!this.maxCalced) {
        this.sumFlowL += this.maxFlowL
        this.sumFlowR += this.maxFlowR
        this.cycleFlowL = this.maxFlowL
        this.cycleFlowR = this.maxFlowR
        this.maxFlowL = 0
        this.maxFlowR = 0
        this.cycles += 1
        this.maxCalced = true
      }
    } else {
      this.maxCalced = false
      this.maxPressR = Math.max(this.maxPressR, this.pressR)
      this.maxFlowR = Math.max(this.maxFlowR, flowR)
      this.maxPressL = Math.max(this.maxPressL, this.pressL)
      this.maxFlowL = Math.max(this.maxFlowL, flowL)
    }
    l.deflateFactor = l.deflateFactor > 80 ? l.deflateFactor - 80 : 0
    l.inflateFactor = l.inflateFactor > 80 ? l.inflateFactor - 80 : 0
    const lvl = l.deflatedL ? 0 : l.volL
    const lvr = l.deflatedR ? 0 : l.volR
    this.points.push({ x: this.t, y: (lvl + lvr + l.deflateFactor - l.inflateFactor) / 1000 })
  }

  finish(): void {
    if (this.done) return
    this.done = true
    const c = this.cycles || 1
    this.results = {
      pressureL: this.maxPressL,
      pressureR: this.maxPressR,
      flowL: this.sumFlowL / c,
      flowR: this.sumFlowR / c,
      totalFlow: (this.sumFlowL + this.sumFlowR) / c
    }
  }
}

// ---------- Experimento 3: variaciones en la respiración ----------

export type BreathCondition = 'normal' | 'rapid' | 'rebreathing' | 'holding'
type BreathType = 'normal' | 'hyper' | 'rebreathing' | 'holding' | 'resumeNormal'

/** índices de breathingConditions del original */
const CONDITION_OF: Record<number, BreathCondition> = { 1: 'normal', 2: 'rapid', 3: 'rebreathing', 4: 'holding' }

export interface BreathingResults {
  condition: BreathCondition
  pco2: number
  maxPco2: number
  minPco2: number
  pumpRate: number
  totalFlow: number
}

export class BreathingRun {
  readonly radius: number
  private readonly random: () => number
  t = 0
  private tOffset = 0
  private readonly tInc = 0.25
  private cycleOffset = 180
  private breathingCycle = 15
  private nextBreathingCycle = 15
  private type: BreathType = 'normal'
  private nextType: BreathType = 'normal'
  private rebreathFactor = 1
  private basePassed = 0
  private lastPco2 = 45
  private resultCondition = 1
  /** condición mostrada en pantalla */
  displayCondition: BreathCondition | 'resume' = 'normal'
  private target = { hyper: 32, rebreathing: 55, holding: 70 }
  pco2 = 45
  maxPco2 = 0
  minPco2 = 1_000_000
  private totalPco2 = 0
  private frames = 0
  private cycles = 0
  private maxVol = 0
  private avgMaxVolume = 0
  private maxCalced = false
  volL = 1200
  volR = 1200
  lungScale = 100
  done = false
  readonly points: VolumePoint[] = []
  results: BreathingResults | null = null

  constructor(radius: number, random: () => number = Math.random) {
    this.radius = radius
    this.random = random
  }

  /** el original usaba Math.random(n), que ignora el argumento: el objetivo queda entre base−1 y base */
  private pick(base: number): number {
    return base + (this.random() - 1)
  }

  get current(): BreathType {
    return this.type
  }

  rapid(): void {
    this.target.hyper = this.pick(32)
    this.nextType = 'hyper'
    this.nextBreathingCycle = 4
    this.resultCondition = 2
  }

  rebreathe(): void {
    this.target.rebreathing = this.pick(55)
    this.nextType = 'rebreathing'
    this.nextBreathingCycle = 15
    this.resultCondition = 3
  }

  holdBreath(): void {
    this.target.holding = this.pick(70)
    this.nextType = 'holding'
    this.nextBreathingCycle = 15
    this.resultCondition = 4
  }

  normalBreathing(): void {
    this.basePassed = 1
    this.nextType = 'resumeNormal'
    this.lastPco2 = this.pco2
    if (this.type === 'hyper') this.nextBreathingCycle = 15 * 1.3
    else {
      this.nextBreathingCycle = 15
      this.rebreathFactor = 1
    }
  }

  /** la bolsa de reinhalación está inflada */
  get bagOn(): boolean {
    return this.type === 'rebreathing'
  }

  private fraction(target: number): number {
    return ((target - 45) * this.breathingCycle) / (4 * 50)
  }

  private switchType(cycleOffset: number): void {
    this.breathingCycle = this.nextBreathingCycle
    if (this.type !== this.nextType) {
      this.tOffset += this.t
      this.cycleOffset = cycleOffset
      this.t = 0
      this.displayCondition = this.nextType === 'resumeNormal' ? 'resume' : (CONDITION_OF[this.resultCondition] ?? 'normal')
    }
    this.type = this.nextType
  }

  step(): void {
    if (this.done) return
    if (this.t + this.tOffset >= T_MAX) {
      this.finish()
      return
    }
    this.t += this.tInc
    this.frames += 1
    const degs = this.t * (360 / (60 / (15 * (15 / this.breathingCycle))))
    const pressure = Math.round(1.06 * Math.sin(rad(degs + this.cycleOffset)) * 100) / 100
    const flow = -0.15 * this.rebreathFactor * Math.pow(this.radius, 4) * pressure
    this.lungScale += flow / (44 + Math.sqrt(Math.max(0.01, Math.abs(flow))))
    if (this.type === 'resumeNormal' && flow > 0 && this.basePassed === 1 && this.resultCondition === 4) {
      this.rebreathFactor = 1.3
      this.basePassed = 0
    }
    if (this.type !== 'holding') {
      this.volL += flow / 2
      this.volR += flow / 2
    }
    this.points.push({ x: this.t + this.tOffset, y: (this.volL + this.volR) / 1000 })

    const mod = degs % 360
    const holdingInvolved = this.nextType === 'holding' || this.type === 'holding'
    if (mod >= 280 && mod <= 360 && (this.type === 'hyper' || mod >= 320)) {
      if (!this.maxCalced) {
        this.cycles += this.type === 'hyper' ? 1.1 : 1
        this.avgMaxVolume += this.maxVol
        if (!holdingInvolved) {
          if (this.type === 'hyper') this.pco2 += this.fraction(this.target.hyper)
          if (this.type === 'resumeNormal') this.pco2 -= ((this.lastPco2 - 45) * this.breathingCycle) / (4 * 50)
          if (this.type === 'rebreathing') {
            this.rebreathFactor *= 1.0195
            this.pco2 += this.fraction(this.target.rebreathing) * 1.0195
          }
          this.switchType(180)
        }
        this.maxCalced = true
      }
    } else if (160 < mod && mod <= 200 && holdingInvolved) {
      if (!this.maxCalced) {
        if (this.type === 'holding') this.pco2 += this.fraction(this.target.holding)
        this.switchType(0)
        this.maxCalced = true
      }
    } else if (!(mod >= 280 && mod <= 360)) {
      this.maxCalced = false
    }
    this.maxVol = Math.max(this.maxVol, this.volL + this.volR)
    this.maxPco2 = Math.max(this.maxPco2, this.pco2)
    this.minPco2 = Math.min(this.minPco2, this.pco2)
    this.totalPco2 += this.pco2
  }

  finish(): void {
    if (this.done) return
    this.done = true
    const elapsed = this.t + this.tOffset
    this.results = {
      condition: CONDITION_OF[this.resultCondition] ?? 'normal',
      pco2: this.totalPco2 / Math.max(1, elapsed / this.tInc),
      maxPco2: this.maxPco2,
      minPco2: this.minPco2,
      pumpRate: this.cycles / (Math.max(elapsed, 0.25) / 60),
      totalFlow: Math.round((this.avgMaxVolume / Math.max(1, this.cycles)) * 100) / 100
    }
  }
}

export { r2 }
