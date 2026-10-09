/**
 * Corazón de rana de 04_FrogCardio.swf (frame_2/DoAction_3.as y DoAction_4.as): una máquina de
 * estados (contracción/relajación de aurículas y ventrículo, latencia, extrasístole, pausa
 * compensatoria, bloqueo vagal) y una curva cúbica que une los niveles de cada estado.
 * El tiempo está en segundos de simulación; la pantalla tiene 450 puntos de ancho.
 */

export type HeartPhase = 'AC' | 'AR' | 'VC' | 'VR' | 'VRstim' | 'L' | 'ESC' | 'ESR' | 'CP' | 'VL'
export type RateStatus = 'normal' | 'stable' | 'changing' | 'none'
export type Experiment = 'es' | 'mr'

/** ancho del monitor en puntos y puntos dibujados por frame (20 fps) */
export const GRAPH_WIDTH = 450
export const DOTS_PER_FRAME = 4
export const V_MAX = 6.5

/** Fármacos e iones del experimento 2 */
export type Drug = 'Pilo' | 'Atro' | 'Epin' | 'Digi' | 'Calc' | 'Sodi' | 'Pota'
export const DRUGS: Drug[] = ['Pilo', 'Atro', 'Epin', 'Digi', 'Calc', 'Sodi', 'Pota']

/** efecto de cada fármaco: escala de aurícula, ventrículo y frecuencia, y si produce arritmia */
const DRUG_EFFECT: Record<Drug, { atr: number; ven: number; rate: number; arrhythmia: boolean }> = {
  Pilo: { atr: 1, ven: 1, rate: 0.75, arrhythmia: false },
  Atro: { atr: 1, ven: 1, rate: 1.17, arrhythmia: false },
  Epin: { atr: 1.1, ven: 1.1, rate: 1.33, arrhythmia: false },
  Digi: { atr: 1, ven: 1, rate: 0.69, arrhythmia: false },
  Calc: { atr: 1.1, ven: 1.1, rate: 0.93, arrhythmia: true },
  Sodi: { atr: 0.9, ven: 0.9, rate: 0.917, arrhythmia: true },
  Pota: { atr: 0, ven: 0.5, rate: 0.917, arrhythmia: true }
}

export type RingerTemp = 5 | 23 | 32
const RINGER_RATE: Record<RingerTemp, number> = { 5: 0.83, 23: 1, 32: 1.17 }

/** a los 7200 "ticks" (2 min) de aplicar un fármaco, el original lavaba con Ringer a 23° */
export const RETURN_TO_NORMAL_FRAMES = 2400

export interface GraphPoint {
  x: number
  y: number
}

export class FrogHeart {
  readonly experiment: Experiment
  private readonly random: () => number

  // heartMaster
  readonly rNom: number
  readonly aNom = 1
  readonly vNom = 4
  private readonly rMaxMultiStim: number
  private readonly switchRate: number
  private readonly vagalLockupRate: number
  private readonly vlTime: number
  private readonly vagusEscapeRate: number
  private readonly vagusRateScale: number
  private readonly rateDelta: number
  /** escala de tiempo de la pantalla (10 o 15 s) */
  uMax = 10
  private deltaT: number
  tNow = 0
  private lastT = 0
  private stimTime = 0
  private stimIncrement = 0
  private vagusStim = false

  // param
  private atrNow: number
  private venNow: number
  rateNow: number
  private atrTarget: number
  private venTarget: number
  rateTarget: number
  private arrhythmia = false
  private arrhythmiaTarget = 0
  private vagus = false
  private fullEffectAchieved = false
  private readonly atrDecay: number
  private readonly venDecay: number
  private readonly rateDecay: number
  private readonly vagusRateDecay: number

  // heartState
  phase: HeartPhase = 'L'
  private tState = 0
  private tStartState = 0
  private vagusLockPending = false
  private potassiumPresent = false

  // heartSim
  private levelNow = 0
  private vNow = 0
  private levelStart = 0
  private vStart = 0
  private targetLevel = 0
  private targetTime = 0
  private a2 = 0
  private a3 = 0

  // salidas
  /** frecuencia mostrada (`null` = "----" durante el bloqueo vagal) */
  displayedRate: number | null = null
  status: RateStatus = 'none'
  /** botones de Ringer habilitados (experimento 2): 5° y 32°, sólo 23°, o ninguno */
  ringerButtons: 'nonRoom' | 'room' | 'none' = 'none'
  /** se pueden usar los goteros (experimento 2) */
  droppersAvailable = false
  /** frecuencia objetivo redondeada: es lo que registraba la tabla del original (mrHeartRate) */
  targetRateRounded: number
  /** puntos de la pantalla actual */
  points: GraphPoint[] = []

  constructor(experiment: Experiment, random: () => number = Math.random) {
    this.experiment = experiment
    this.random = random
    this.rNom = 58 + Math.ceil(random() * 4)
    this.rMaxMultiStim = this.rNom * 1.1
    this.switchRate = this.rNom * 0.66
    this.vagalLockupRate = this.rNom * 0.3
    this.vlTime = this.rNom * 0.12
    this.vagusEscapeRate = this.rNom * 0.83
    this.vagusRateScale = (this.rNom - this.vagalLockupRate) / (this.rNom * 0.66)
    this.rateDelta = this.rNom * 0.02
    this.deltaT = this.uMax / GRAPH_WIDTH
    // las constantes de tiempo se fijan al empezar y no cambian con la escala (como el original)
    this.atrDecay = Math.exp(-this.deltaT / 2)
    this.venDecay = Math.exp(-this.deltaT / 2)
    this.rateDecay = Math.exp(-this.deltaT / 2)
    this.vagusRateDecay = Math.exp(-this.deltaT / 10)
    this.atrNow = this.aNom
    this.venNow = this.vNom
    this.rateNow = this.rNom
    this.atrTarget = this.aNom
    this.venTarget = this.vNom
    this.rateTarget = this.rNom
    this.targetRateRounded = Math.round(this.rNom)
  }

  /** Un frame: 4 puntos de la curva (heartMaster.stepFrame) */
  stepFrame(): void {
    if (this.experiment === 'es') this.checkMultiStim()
    for (let i = 0; i < DOTS_PER_FRAME; i++) {
      this.tNow += this.deltaT
      this.updateParams()
      this.updateState(this.tNow)
      this.drawPoint(this.tNow, this.updateSim(this.tNow))
    }
  }

  /** "Modify Display": 10 s (mejor trazo) o 15 s (más rápido) */
  changeScale(uMax: 10 | 15): void {
    this.lastT = this.tNow
    this.uMax = uMax
    this.points = []
    this.deltaT = uMax / GRAPH_WIDTH
  }

  // ---------- estímulos (experimento 1) ----------

  /** Estímulo único: extrasístole si el corazón está en latencia o al final de la relajación */
  singleStimulus(): void {
    if (this.phase === 'L' || this.phase === 'VRstim') {
      this.tStartState = this.tNow
      this.phase = 'ESC'
      this.tState = this.vcTime()
      this.setSim(this.venNow, this.tNow, this.tState)
    }
  }

  /** Estímulos múltiples sobre el corazón: sube un poco la frecuencia y produce extrasístoles al azar */
  startMultiStim(stimRate: number): void {
    this.singleStimulus()
    this.stimIncrement = 1 / stimRate
    this.stimTime = this.tNow + this.stimIncrement
    const first = this.rNom + ((this.rMaxMultiStim - this.rNom) * (stimRate - 2)) / (10 - 2)
    this.setTargets(this.aNom, this.vNom, Math.max(this.rNom, Math.min(this.rMaxMultiStim, first)), false)
  }

  stopMultiStim(): void {
    this.stimTime = 0
    this.setTargets(this.aNom, this.vNom, this.rNom, false)
  }

  /** Estimulación del vago: baja la frecuencia y, si es intensa, detiene el corazón (bloqueo vagal) */
  vagusOn(stimRate: number): void {
    this.stimIncrement = 1 / stimRate
    this.stimTime = this.tNow + this.stimIncrement
    this.vagusStim = true
    this.vagus = true
    this.setTargets(this.aNom, this.vNom, this.rNom - this.vagusRateScale * stimRate, false)
  }

  vagusOff(): void {
    this.stimTime = 0
    this.vagusStim = false
    this.setTargets(this.aNom, this.vNom, this.rNom, false)
    this.vagus = false
    this.vagusLockPending = false
    if (this.phase === 'VL') {
      this.tStartState = this.tNow
      this.phase = 'AC'
      this.tState = this.acTime()
      this.setSim(this.atrNow, this.tNow, this.tState)
      this.reportRate()
    }
  }

  /** el estimulador está activo (para la luz del original) */
  get stimulating(): boolean {
    return this.stimTime > 0
  }

  private checkMultiStim(): void {
    if (this.stimTime > 0 && this.stimTime < this.tNow) {
      if (!this.vagusStim && Math.ceil(this.random() * 7) === 7) this.singleStimulus()
      this.stimTime = this.tNow + this.stimIncrement
    }
  }

  // ---------- modificadores (experimento 2) ----------

  applyDrug(drug: Drug): void {
    const e = DRUG_EFFECT[drug]
    if (drug === 'Pota') this.potassiumPresent = true
    this.setTargets(this.aNom * e.atr, this.vNom * e.ven, this.rNom * e.rate, e.arrhythmia)
  }

  /** Lavado con Ringer: a 23° vuelve a la normalidad y quita el potasio */
  applyRinger(temp: RingerTemp): void {
    if (temp === 23) this.potassiumPresent = false
    this.setTargets(this.aNom, this.vNom, this.rNom * RINGER_RATE[temp], false)
  }

  // ---------- param ----------

  private setTargets(atr: number, ven: number, rate: number, arrhythmia: boolean): void {
    this.atrTarget = atr
    this.venTarget = ven
    this.arrhythmia = arrhythmia
    if (arrhythmia) this.arrhythmiaTarget = rate
    this.rateTarget = rate
    this.fullEffectAchieved = false
    if (this.experiment === 'mr') {
      this.ringerButtons = 'none'
      this.targetRateRounded = Math.round(rate)
    }
  }

  private updateParams(): void {
    this.atrNow = this.atrNow * this.atrDecay + this.atrTarget * (1 - this.atrDecay)
    this.venNow = this.venNow * this.venDecay + this.venTarget * (1 - this.venDecay)
    if (this.vagus) {
      this.rateNow = this.rateNow * this.vagusRateDecay + this.rateTarget * (1 - this.vagusRateDecay)
      if (Math.round(this.rateNow) < Math.round(this.vagalLockupRate)) {
        this.rateNow = this.vagalLockupRate
        this.rateTarget = this.vagalLockupRate
        this.vagusLockPending = true
      }
    } else {
      this.rateNow = this.rateNow * this.rateDecay + this.rateTarget * (1 - this.rateDecay)
    }
  }

  private isRateStable(): boolean {
    return Math.abs(this.rateNow - this.rateTarget) < this.rateDelta
  }

  private isRateNormal(): boolean {
    return Math.abs(this.rateNow - this.rNom) < this.rateDelta
  }

  private scaled(scale: number): number {
    return Math.min((scale * this.rNom) / this.rateNow, (scale * this.rNom) / this.switchRate)
  }

  /** duración de la contracción auricular; también decide la arritmia (getACtime) */
  private acTime(): number {
    if (this.isRateStable() && !this.isRateNormal()) this.fullEffectAchieved = true
    if (this.arrhythmia && this.fullEffectAchieved) {
      this.rateTarget = this.arrhythmiaTarget + (this.random() * 3 - 2) * 20
    }
    // el original usaba la escala de relajación auricular también para la contracción
    return this.scaled(0.2)
  }

  private arTime = (): number => this.scaled(0.2)
  private vcTime = (): number => this.scaled(0.3)
  private vrTime = (): number => this.scaled(0.29)
  private lTime = (): number => Math.max(this.rNom / this.rateNow - this.rNom / this.switchRate, 0)
  private cpTime = (): number => (60 / this.rateNow) * (1 + this.random())

  /** reportRate: frecuencia y estado mostrados; en el experimento 2 habilita goteros y Ringer */
  private reportRate(blocked = false): void {
    this.displayedRate = blocked ? null : Math.round(this.rateNow)
    if (blocked) {
      this.status = 'none'
      return
    }
    const mr = this.experiment === 'mr'
    if (this.isRateStable()) {
      if (this.isRateNormal()) {
        this.status = 'normal'
        if (mr) {
          if (this.ringerButtons === 'none') this.ringerButtons = 'nonRoom'
          this.droppersAvailable = true
        }
      } else {
        this.status = 'stable'
        if (mr) {
          if (this.ringerButtons === 'none') this.ringerButtons = 'room'
          this.droppersAvailable = false
        }
      }
    } else {
      this.status = 'changing'
      if (mr) {
        this.droppersAvailable = false
        if (this.fullEffectAchieved && this.ringerButtons === 'none') this.ringerButtons = 'room'
      }
    }
  }

  // ---------- heartState ----------

  private updateState(t: number): void {
    if (t < this.tStartState + this.tState) return
    if (this.tStartState === 0) this.tStartState = t
    else this.tStartState += this.tState
    this.stateChange(t)
  }

  private stateChange(t: number): void {
    switch (this.phase) {
      case 'AC':
        this.phase = 'AR'
        this.tState = this.arTime()
        this.setSim(0, t, this.tState * 2)
        return
      case 'AR':
        this.phase = 'VC'
        this.tState = this.vcTime()
        this.setSim(this.venNow, t, this.tState)
        return
      case 'VC': {
        this.phase = 'VR'
        const d = this.vrTime()
        this.tState = (1 - 0.66) * d
        this.setSim(0.1, t, d)
        return
      }
      case 'VR':
        this.phase = 'VRstim'
        this.tState = 0.66 * this.vrTime()
        this.setSim(0, t, this.tState)
        return
      case 'VRstim':
        this.phase = 'L'
        this.tState = this.lTime()
        this.setSim(0, t, this.tState)
        return
      case 'L':
        if (this.vagusLockPending) {
          this.phase = 'VL'
          this.tState = this.vlTime
          this.setSim(0, t, this.tState)
          this.reportRate(true)
          this.vagusLockPending = false
        } else if (this.potassiumPresent && 3 < this.random() * 4) {
          // con potasio a veces el ventrículo late sin la aurícula
          this.phase = 'VC'
          this.tState = this.vcTime()
          this.setSim(this.venNow, t, this.tState)
        } else {
          this.toAC(t)
        }
        return
      case 'ESC':
        this.phase = 'ESR'
        this.tState = this.vrTime()
        this.setSim(0, t, this.tState)
        return
      case 'ESR':
        this.phase = 'CP'
        this.tState = this.cpTime()
        this.setSim(0, t, this.tState)
        return
      case 'CP':
        this.toAC(t)
        return
      case 'VL':
        // escape vagal: el corazón vuelve a latir, más lento. El original no recalculaba la
        // duración de esta contracción (quedaba la del bloqueo); aquí se usa la normal.
        this.phase = 'AC'
        this.tState = this.acTime()
        this.setSim(this.atrNow, t, this.tState)
        this.rateTarget = this.vagusEscapeRate
        this.reportRate()
        return
    }
  }

  private toAC(t: number): void {
    this.phase = 'AC'
    this.tState = this.acTime()
    this.setSim(this.atrNow, t, this.tState)
    this.reportRate()
  }

  // ---------- heartSim: curva cúbica entre niveles ----------

  private setSim(level: number, t: number, duration: number): void {
    if (!(duration > 0)) {
      this.a2 = 0
      this.a3 = 0
      return
    }
    this.vStart = this.vNow
    this.levelStart = this.levelNow
    this.targetTime = t + duration
    if (this.targetLevel === 0 && level === 0) {
      this.a2 = 0
      this.a3 = 0
      return
    }
    this.targetLevel = level
    const td = t - this.targetTime
    const ld = this.levelStart - this.targetLevel
    this.a2 = (3 * ld) / (td * td) - this.vStart / td
    this.a3 = this.vStart / (td * td) - (2 * ld) / (td * td * td)
  }

  private updateSim(t: number): number {
    const td = t - this.targetTime
    this.levelNow = this.a2 * td * td + this.a3 * td * td * td + this.targetLevel
    this.vNow = 2 * this.a2 * td + 3 * this.a3 * td * td
    return this.levelNow
  }

  // ---------- graph ----------

  private drawPoint(t: number, y: number): void {
    const px = Math.round(((t - this.lastT) * GRAPH_WIDTH) / this.uMax)
    let screenPx = px
    let clear = false
    if (px > GRAPH_WIDTH) {
      screenPx = px % GRAPH_WIDTH
      if (screenPx === 0) clear = true
    } else if (px === GRAPH_WIDTH) {
      clear = true
    }
    this.points.push({ x: (screenPx * this.uMax) / GRAPH_WIDTH, y })
    if (clear) this.points = []
  }

  /** nivel actual de aurícula y ventrículo, para dibujar el corazón */
  get levels(): { atr: number; ven: number } {
    return { atr: this.atrNow, ven: this.venNow }
  }
}
