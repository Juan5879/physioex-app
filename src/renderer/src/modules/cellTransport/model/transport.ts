import {
  CARRIERS,
  ETIME,
  EXPERIMENT_SOLUTES,
  SOLUTES,
  round3,
  round4,
  type BeakerExperiment,
  type SoluteId
} from './constants'

/** concentración (mM) de cada soluto en un vaso */
export type Conc = Partial<Record<SoluteId, number>>

export interface TransportSetup {
  experiment: BeakerExperiment
  /** concentraciones actuales de cada vaso al iniciar la corrida */
  left: Conc
  right: Conc
  /**
   * valores de los controles de cada vaso (lo que se dispensó). El original los usaba para la
   * presión osmótica y para el total de Na+/K+ cuando el transporte termina.
   */
  startLeft: Conc
  startRight: Conc
  /** duración de la corrida (min) */
  maxTime: number
  /** membrana de diálisis (difusión simple y ósmosis) */
  mwco?: number
  /** transportadores de glucosa (difusión facilitada y transporte activo) */
  carriers?: number
  /** bombas Na+/K+ (transporte activo) */
  pumps?: number
  /** ATP disponible (mM, transporte activo) */
  atp?: number
}

const val = (c: Conc, s: SoluteId): number => c[s] ?? 0

/**
 * Difusión simple a través de la membrana durante un paso (f_simpleDiffusionCalc).
 * Devuelve las nuevas concentraciones y la velocidad de difusión.
 */
export function simpleDiffusion(
  concL: number,
  concR: number,
  difCo: number
): { left: number; right: number; rate: number } {
  const rate = Math.abs(concL - concR) * difCo
  return applyRate(concL, concR, rate)
}

/**
 * Difusión facilitada por transportadores de glucosa (f_carriersCalc): la diferencia de
 * concentración se satura en 6 mM y la velocidad es proporcional al número de transportadores.
 */
export function carrierDiffusion(
  concL: number,
  concR: number,
  carriers: number
): { left: number; right: number; rate: number } {
  const carrierEffect = carriers / CARRIERS.max
  const concDif = Math.min(6, Math.abs(concL - concR))
  const rate = concDif * SOLUTES.Gluc.difCo * 1.2 * carrierEffect
  return applyRate(concL, concR, rate)
}

function applyRate(concL: number, concR: number, rate: number): { left: number; right: number; rate: number } {
  if (round4(rate) === 0) {
    const eq = (concL + concR) / 2
    return { left: eq, right: eq, rate }
  }
  const change = rate * ETIME
  return concR < concL
    ? { left: concL - change, right: concR + change, rate }
    : { left: concL + change, right: concR - change, rate }
}

/** Presión osmótica (mm Hg) durante la corrida de ósmosis (f_osCalc) */
export function osmoticPressure(
  startLeft: Conc,
  startRight: Conc,
  difCo: { NaCl: number; Gluc: number },
  realTime: number
): { left: number; right: number; timeToEquilibrium: number } {
  let effect = 0
  let timeToEquilibrium = 12
  if (difCo.NaCl <= 0) effect += (val(startLeft, 'NaCl') - val(startRight, 'NaCl')) * 2 * 17
  const gl = val(startLeft, 'Gluc')
  const gr = val(startRight, 'Gluc')
  if (difCo.Gluc <= 0) effect += (gl - gr) * 17
  else if ((gl > 0 || gr > 0) && gl !== gr) timeToEquilibrium = 42
  effect += (val(startLeft, 'Albu') - val(startRight, 'Albu')) * 17

  const totalTime = Math.min(realTime, timeToEquilibrium)
  const presL = Math.round((effect / timeToEquilibrium) * totalTime)
  return presL < 0
    ? { left: 0, right: Math.abs(presL), timeToEquilibrium }
    : { left: presL, right: 0, timeToEquilibrium }
}

/** Resultado de un soluto al terminar la corrida (f_showCalcOver) */
export type SoluteOutcome =
  | { solute: SoluteId; kind: 'noDiffusion' | 'noTransport' | 'notReached' | 'interrupted' }
  | { solute: SoluteId; kind: 'equilibrium' | 'finished'; time: number }

/**
 * Una corrida de difusión simple, facilitada, ósmosis o transporte activo. Cada `tick()` es
 * un minuto simulado (f_doCalculations), igual que el original cada 10 frames.
 */
export class TransportRun {
  readonly experiment: BeakerExperiment
  readonly solutes: SoluteId[]
  readonly setup: TransportSetup
  readonly left: Conc
  readonly right: Conc
  /** minuto del último cálculo */
  realTime = 0
  done = false
  readonly cumRate: Partial<Record<SoluteId, number>> = {}
  readonly currentRate: Partial<Record<SoluteId, number>> = {}
  /** minuto en que el soluto llegó al equilibrio (0 = no llegó) */
  readonly eqlm: Partial<Record<SoluteId, number>> = {}
  /** velocidad media de cada soluto (a_avRate) */
  avRate: Partial<Record<SoluteId, number>> = {}
  /** presión osmótica (ósmosis) */
  presL = 0
  presR = 0
  /** minuto en que la presión osmótica se estabilizó (0 = no) */
  eqlmPres = 0
  /** ATP disponible (transporte activo), redondeado a 3 decimales como la pantalla del original */
  atp: number

  constructor(setup: TransportSetup) {
    this.setup = setup
    this.experiment = setup.experiment
    this.solutes = EXPERIMENT_SOLUTES[setup.experiment]
    this.left = { ...setup.left }
    this.right = { ...setup.right }
    this.atp = round3(setup.atp ?? 0)
    for (const s of this.solutes) {
      this.cumRate[s] = 0
      this.currentRate[s] = 0
      this.eqlm[s] = 0
      this.avRate[s] = 0
    }
  }

  /** Avanza un minuto. Devuelve `false` (y marca `done`) cuando se acabó el tiempo. */
  tick(): boolean {
    if (this.realTime + 1 > this.setup.maxTime) {
      this.done = true
      return false
    }
    this.realTime += 1
    switch (this.experiment) {
      case 'sd':
      case 'os':
        this.sdosCalc()
        break
      case 'fd':
        this.diffuse('NaCl', SOLUTES.NaCl.difCo)
        if ((this.setup.carriers ?? 0) > 0) this.glucoseTransport()
        break
      case 'at':
        this.glucoseTransport()
        this.activeTransport()
        break
    }
    this.makeAvRate()
    return true
  }

  /** hay algún soluto moviéndose (decide si "Pausa" detiene o pausa la corrida) */
  get anyDiffusion(): boolean {
    return this.solutes.some((s) => (this.currentRate[s] ?? 0) !== 0)
  }

  private difCoFor(s: SoluteId): number {
    return (this.setup.mwco ?? 0) >= SOLUTES[s].minMWCO ? SOLUTES[s].difCo : 0
  }

  private sdosCalc(): void {
    const naclCo = this.difCoFor('NaCl')
    const glucCo = this.difCoFor('Gluc')
    if (naclCo > 0) this.diffuse('NaCl', naclCo)
    const ureaCo = this.difCoFor('Urea')
    if (ureaCo > 0 && this.experiment === 'sd') this.diffuse('Urea', ureaCo)
    if (glucCo > 0) this.diffuse('Gluc', glucCo)
    if (this.experiment === 'os') {
      const p = osmoticPressure(
        this.setup.startLeft,
        this.setup.startRight,
        { NaCl: naclCo, Gluc: glucCo },
        this.realTime
      )
      this.presL = p.left
      this.presR = p.right
      if (this.realTime === p.timeToEquilibrium) this.eqlmPres = p.timeToEquilibrium
    }
  }

  /** f_figureOutSoluteDiffusion / f_figureOutGlucoseTransport */
  private step(s: SoluteId, calc: (l: number, r: number) => { left: number; right: number; rate: number }): void {
    const concL = val(this.left, s)
    const concR = val(this.right, s)
    if (!(concL > 0 || concR > 0) || round4(concL) === round4(concR)) return
    const res = calc(concL, concR)
    this.left[s] = res.left
    this.right[s] = res.right
    if (round4(res.rate) === 0) {
      this.eqlm[s] = this.realTime
      this.currentRate[s] = 0
    } else {
      this.cumRate[s] = (this.cumRate[s] ?? 0) + res.rate
      this.currentRate[s] = res.rate
    }
  }

  private diffuse(s: SoluteId, difCo: number): void {
    this.step(s, (l, r) => simpleDiffusion(l, r, difCo))
  }

  private glucoseTransport(): void {
    const carriers = this.setup.carriers ?? 0
    this.step('Gluc', (l, r) => carrierDiffusion(l, r, carriers))
  }

  /** Bomba Na+/K+ (f_figureOutActiveTransport + f_transportCalc): Na+ izq→der, K+ der→izq, 3:2 */
  private activeTransport(): void {
    let naL = val(this.left, 'Napl')
    let kR = val(this.right, 'Kplu')
    let atp = this.atp
    if (round4(naL) === 0 || round4(kR) === 0 || round4(atp) === 0) return

    const pumpEffect = (this.setup.pumps ?? 0) / CARRIERS.max
    let naRate = naL * SOLUTES.Napl.difCo * 1.2 * pumpEffect
    let kRate = kR * SOLUTES.Kplu.difCo * 1.2 * pumpEffect
    if (kRate < naRate) naRate = (kRate * 3) / 2
    else kRate = (naRate * 2) / 3
    const naChange = naRate * ETIME
    const kChange = kRate * ETIME

    naL -= naChange
    let naR = val(this.right, 'Napl') + naChange
    if (round3(naL) === 0) {
      naL = 0
      naR = val(this.setup.startRight, 'Napl') + val(this.setup.startLeft, 'Napl')
    }
    kR -= kChange
    let kL = val(this.left, 'Kplu') + kChange
    if (round3(kR) === 0) {
      kR = 0
      kL = val(this.setup.startRight, 'Kplu') + val(this.setup.startLeft, 'Kplu')
    }
    atp = Math.max(0, atp - naChange / 3)

    this.left.Napl = naL
    this.right.Napl = naR
    this.left.Kplu = kL
    this.right.Kplu = kR
    this.atp = round3(atp)

    if (round4(naL) === 0 || round4(kR) === 0 || round4(atp) === 0) {
      for (const s of ['Napl', 'Kplu'] as const) {
        this.eqlm[s] = this.realTime
        this.currentRate[s] = 0
      }
    } else {
      this.cumRate.Napl = (this.cumRate.Napl ?? 0) + naRate
      this.currentRate.Napl = naRate
      this.cumRate.Kplu = (this.cumRate.Kplu ?? 0) + kRate
      this.currentRate.Kplu = kRate
    }
  }

  private makeAvRate(): void {
    const av: Partial<Record<SoluteId, number>> = {}
    for (const s of this.solutes) {
      const t = this.eqlm[s] || this.realTime
      av[s] = (this.cumRate[s] ?? 0) / t
    }
    this.avRate = av
  }

  /** Mensaje de fin de corrida, soluto por soluto (f_showCalcOver) */
  outcomes(): SoluteOutcome[] {
    const at = this.experiment === 'at'
    const out: SoluteOutcome[] = []
    for (const s of this.solutes) {
      if (val(this.left, s) === 0 && val(this.right, s) === 0) continue
      const t = this.eqlm[s] ?? 0
      if ((this.avRate[s] ?? 0) === 0) out.push({ solute: s, kind: at ? 'noTransport' : 'noDiffusion' })
      else if (t === 0) out.push({ solute: s, kind: at && s === 'Gluc' ? 'interrupted' : 'notReached' })
      else out.push({ solute: s, kind: at ? 'finished' : 'equilibrium', time: t })
    }
    return out
  }

  /**
   * Ósmosis: `null` si no hay solutos que no difundan con distinta concentración a cada lado;
   * si los hay, indica si se alcanzó el equilibrio osmótico.
   */
  osmoticEquilibrium(): boolean | null {
    if (this.experiment !== 'os') return null
    const present = this.solutes.some((s) => {
      if (round4(this.cumRate[s] ?? 0) !== 0) return false
      const l = round3(val(this.left, s))
      const r = round3(val(this.right, s))
      return (l > 0 || r > 0) && l !== r
    })
    return present ? this.eqlmPres > 0 : null
  }

  /** la concentración de los vasos todavía difiere (marca "#" en la tabla) */
  unequal(s: SoluteId): boolean {
    return round3(val(this.left, s)) !== round3(val(this.right, s))
  }
}
