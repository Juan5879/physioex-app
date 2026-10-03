import { L_NOM } from './constants'
import { activeScale, passiveForce, round2, voltageRecruitment } from './common'

/** Constantes propias del experimento "Multiple Stimulus" (frame 20 del SWF) */
export const MS = {
  twitchTime: 15,
  tetMax: 6.8,
  relativeTwitchMax: 0.611,
  treppeInit: 0.6,
  treppeTau: 1000,
  treppeGain: 1.5,
  dampingFactor: 2,
  atpTau: 200000,
  atpGain: 0.015,
  filter1Tau: 15,
  /** píxeles del barrido */
  samples: 360,
  /** voltaje inicial del estimulador (V) */
  nomVoltage: 8.2,
  /** estímulos/s permitidos */
  rateMin: 1,
  rateMax: 150
} as const

export type MsMode = 'idle' | 'single' | 'train'

export interface MsStepResult {
  /** posición en el barrido (ms, 0–tMax) o null si no se dibuja */
  x: number | null
  force: number
  /** se aplicó un estímulo en este paso */
  stimulated: boolean
  /** el barrido terminó en este paso */
  done: boolean
}

/**
 * Simulador por pasos del experimento de estímulos múltiples (sumación, tétanos, fatiga).
 * Es un oscilador de 2º orden amortiguado excitado por estímulos, con facilitación
 * (treppe) y agotamiento de ATP. Portado de los clips PlaceObject2_654/664/665/667.
 */
export class MultipleStimulusSim {
  readonly voltage: number
  readonly length: number
  readonly tMax: number
  readonly passive: number

  mode: MsMode = 'idle'
  stimOn = false

  /** fuerza activa máxima del barrido (f_max) */
  activeMax = 0

  private readonly inc: number
  private readonly vrr: number
  private readonly scale: number
  private dtFactor = 2
  private tNow = 0
  private fNow = 0
  private fOld = 0
  private fOldOld = 0
  private omega = 0
  private kappa = 0
  private dGain = 0
  private treppeNow: number = MS.treppeInit
  private treppeDecay = 0
  private atpNow = 1
  private atpDecay = 0
  private fFilt = 0
  private filterDecay = 0
  private stimTime = 0
  private stimRate = 0

  constructor(params: { voltage: number; length: number; tMax: number }) {
    this.voltage = params.voltage
    this.length = params.length
    this.tMax = params.tMax
    this.passive = passiveForce(params.length)
    this.inc = params.tMax / MS.samples
    this.vrr = voltageRecruitment(params.voltage)
    this.scale = params.length === L_NOM ? 1 : activeScale(params.length)
  }

  get totalMax(): number {
    return this.passive + this.activeMax
  }

  /** Pasos por frame del original a 20 fps (7 en estímulo único, 1 en tren) */
  get stepsPerFrame(): number {
    return this.mode === 'train' ? 1 : 7
  }

  private init(dtFactor: number): void {
    const dt = this.inc * dtFactor
    this.dtFactor = dtFactor
    this.fOldOld = 0
    this.fOld = 0
    this.omega = Math.exp(-dt / MS.twitchTime)
    this.kappa = -Math.E * Math.log(this.omega)
    this.dGain = MS.dampingFactor / (this.kappa * this.omega)
    this.activeMax = this.fNow
    this.treppeNow = MS.treppeInit
    this.treppeDecay = Math.exp(-dt / MS.treppeTau)
    this.atpNow = 1
    this.atpDecay = Math.exp(-dt / MS.atpTau)
    this.fFilt = 0
    this.filterDecay = Math.exp(-dt / MS.filter1Tau)
  }

  /** Aplica un estímulo: impulso proporcional a la fuerza todavía disponible */
  private applyStimulus(): void {
    const relativeTwitch = MS.relativeTwitchMax * this.treppeNow * this.vrr
    const fTetanus = this.scale * this.atpNow * MS.tetMax
    const deltaF = this.fNow - this.fOld
    const fAvailable = fTetanus - this.fNow - this.dGain * deltaF
    const fTwitch = fAvailable * relativeTwitch
    this.fNow += this.kappa * this.omega * fTwitch
    this.treppeNow += MS.treppeGain * relativeTwitch * (1 - this.treppeNow)
    this.atpNow -= MS.atpGain * relativeTwitch * this.atpNow
  }

  /** Botón "Single Stimulus": inicia un barrido o suma un estímulo al barrido en curso */
  singleStimulus(): void {
    if (this.mode === 'train') return
    if (this.fNow === 0) this.init(2)
    this.applyStimulus()
    this.mode = 'single'
  }

  /** Botón "Multiple Stimulus" / "Stop Stimulus" */
  toggleTrain(rate: number): void {
    if (this.mode === 'single') return
    if (!this.stimOn) {
      this.stimOn = true
      if (this.fNow === 0) this.init(4)
      this.applyStimulus()
      this.stimRate = round2(1000 / rate)
      this.stimTime = this.tNow + this.stimRate
      this.mode = 'train'
    } else {
      this.stimOn = false
      this.stimTime = 0
      this.stimRate = 100000000
    }
  }

  private advance(): boolean {
    this.tNow += this.inc * this.dtFactor
    let stimulated = false
    if (this.stimTime > 0 && this.stimTime < this.tNow) {
      this.stimTime += this.stimRate
      this.applyStimulus()
      stimulated = true
    }
    this.fOldOld = this.fOld
    this.fOld = this.fNow
    this.fNow = 2 * this.omega * this.fOld - this.omega * this.omega * this.fOldOld
    const filt = this.filterDecay * this.fFilt + (1 - this.filterDecay) * this.fNow
    this.fFilt = this.mode === 'train' ? Math.round(filt * 1000) / 1000 : filt
    this.treppeNow = MS.treppeInit + this.treppeDecay * (this.treppeNow - MS.treppeInit)
    this.atpNow = 1 + this.atpDecay * (this.atpNow - 1)
    if (this.activeMax < this.fFilt) this.activeMax = this.fFilt
    return stimulated
  }

  private finish(): void {
    this.fNow = 0
    this.tNow = 0
    this.stimTime = 0
    this.stimOn = false
    this.mode = 'idle'
  }

  /** Avanza un paso de integración */
  step(): MsStepResult {
    if (this.mode === 'idle') return { x: null, force: 0, stimulated: false, done: true }
    const stimulated = this.advance()
    const force = this.fFilt + this.passive

    if (this.mode === 'single') {
      const x = this.tNow
      if (this.tMax < this.tNow) {
        this.finish()
        return { x: this.tMax, force, stimulated, done: true }
      }
      return { x, force, stimulated, done: false }
    }

    // Modo tren de estímulos: el barrido da la vuelta a la pantalla
    let done = false
    if (this.stimTime === 0 || this.atpNow < 0.005) {
      const tempInt1 = Math.round((this.tNow + this.inc * 2) * 10)
      const tempInt2 = Math.round(this.tMax * 10)
      const modulus = tempInt1 - Math.floor(tempInt1 / tempInt2) * tempInt2
      if ((modulus === 0 && this.fFilt < 0.05) || (this.fFilt < 0.05 && !this.stimOn)) done = true
    }
    let x: number | null = null
    if (!(this.fFilt < 0.005 && this.tNow > 1)) {
      let px = this.tNow / this.inc
      if (px > MS.samples) px -= Math.floor(px / MS.samples) * MS.samples
      x = px * this.inc
    }
    if (done) this.finish()
    return { x, force, stimulated, done }
  }
}
