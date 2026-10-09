import { useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import type { DataColumn } from '@/shared/components/DataTable'
import { DataSetTable, PrintDataSets } from '@/shared/components/DataSetTable'
import { ExperimentTools } from '@/shared/components/ExperimentTools'
import { Stepper } from '@/shared/components/Stepper'
import { ToolbarPortal } from '@/shared/components/ToolbarSlot'
import { Button, Light, Notice, Panel, Readout } from '@/shared/components/ui'
import { fixed } from '@/shared/lib/format'
import { useFrameLoop } from '@/shared/lib/useFrameLoop'
import { PumpApparatus } from '../components/Apparatus'
import { PM, PM_BEAKER, PM_CONV, pumpCalc, round1, type PumpAlert } from '../model/cardio'
import { usePumpSets, type PumpRow } from '../store'

/** el bombeo completo dura a lo sumo 20 s */
const MAX_FRAMES = 400

export function pumpColumns(t: TFunction): DataColumn<PumpRow>[] {
  return [
    { key: 'flow', header: t('columns.flow'), value: (r) => r.flow, format: (r) => fixed(r.flow, 1) },
    { key: 'radiusL', header: t('columns.radiusL'), value: (r) => r.radiusL, format: (r) => fixed(r.radiusL, 1) },
    { key: 'radiusR', header: t('columns.radiusR'), value: (r) => r.radiusR, format: (r) => fixed(r.radiusR, 1) },
    { key: 'strokeVolume', header: t('columns.strokeVolume'), value: (r) => r.strokeVolume, format: (r) => String(r.strokeVolume) },
    { key: 'rate', header: t('columns.rate'), value: (r) => r.rate, format: (r) => fixed(r.rate, 1) },
    { key: 'pressureL', header: t('columns.pressureL'), value: (r) => r.pressureL, format: (r) => String(r.pressureL) },
    { key: 'pressureDif', header: t('columns.pressureDif'), value: (r) => r.pressureDif, format: (r) => String(r.pressureDif) }
  ]
}

/** Estado del émbolo durante el bombeo (f_PumpAnimNext) */
interface PumpJob {
  strokes: number
  done: number
  dir: 'down' | 'up'
  /** volumen en la cámara (ml) */
  vol: number
  start: number
  end: number
  /** ml por frame al bajar (vaciado) y al subir (llenado) */
  downInc: number
  upInc: number
  auto: boolean
  flow: number
  rate: number
}

type Phase = 'ready' | 'pumping' | 'refilling'

/** Experimento 2: la bomba como modelo del corazón (volumen sistólico, frecuencia, resistencias) */
export function PumpMechanics(): ReactNode {
  const { t } = useTranslation('cardioDynamics')
  const store = usePumpSets()
  const [pressureL, setPressureL] = useState<number>(PM.pressureL.initial)
  const [pressurePump, setPressurePump] = useState<number>(PM.pressurePump.initial)
  const [pressureR, setPressureR] = useState<number>(PM.pressureR.initial)
  const [strokes, setStrokes] = useState<number>(PM.strokes.initial)
  const [radiusL, setRadiusL] = useState<number>(PM.radius.initial)
  const [radiusR, setRadiusR] = useState<number>(PM.radius.initial)
  const [volStart, setVolStart] = useState<number>(PM.volumeStart.initial)
  const [volEnd, setVolEnd] = useState<number>(PM.volumeEnd.initial)
  const [volL, setVolL] = useState(PM_BEAKER)
  const [volR, setVolR] = useState(0)
  const [chamber, setChamber] = useState<number>(PM.volumeStart.initial)
  const [valves, setValves] = useState({ L: true, R: false })
  const [phase, setPhase] = useState<Phase>('ready')
  const [canRefill, setCanRefill] = useState(false)
  const [result, setResult] = useState<{ flow: number; rate: number } | null>(null)
  const [recordable, setRecordable] = useState(false)
  const [strokesLeft, setStrokesLeft] = useState<number | null>(null)
  const [alert, setAlert] = useState<PumpAlert | null>(null)
  const job = useRef<PumpJob | null>(null)

  const strokeVolume = volStart - volEnd
  const busy = phase !== 'ready'

  useFrameLoop(busy, () => {
    if (phase === 'refilling') {
      setVolL((v) => {
        const next = Math.min(PM_BEAKER, v + PM_CONV)
        setVolR(PM_BEAKER - next)
        if (next >= PM_BEAKER) setPhase('ready')
        return next
      })
      return
    }
    const j = job.current
    if (!j) return
    if (j.dir === 'down') {
      j.vol = Math.max(j.end, j.vol - j.downInc)
      if (j.vol === j.end) {
        j.dir = 'up'
        setValves({ L: true, R: false })
        setVolR((v) => v + (j.start - j.end))
      }
    } else {
      j.vol = Math.min(j.start, j.vol + j.upInc)
      if (j.vol === j.start) {
        j.dir = 'down'
        j.done += 1
        setVolL((v) => v - (j.start - j.end))
        setStrokesLeft(j.strokes - j.done)
        if (j.done >= j.strokes) {
          job.current = null
          setValves({ L: true, R: false })
          setStrokesLeft(null)
          setPhase('ready')
          if (j.auto) {
            setResult({ flow: round1(j.flow), rate: round1(j.rate) })
            setRecordable(true)
          }
        } else {
          setValves({ L: false, R: true })
        }
      }
    }
    setChamber(j.vol)
  })

  const changed = (): void => {
    setResult(null)
    setRecordable(false)
  }
  const param = (set: (v: number) => void) => (v: number) => {
    set(v)
    changed()
  }

  const pump = (auto: boolean): void => {
    const n = auto ? strokes : 1
    const res = pumpCalc({
      volumeL: volL,
      strokes: n,
      strokeVolume,
      pressureL,
      pressurePump,
      pressureR,
      radiusL,
      radiusR
    })
    if ('alert' in res) {
      setAlert(res.alert)
      return
    }
    if (strokeVolume <= 0) return
    // velocidad del émbolo: px/frame del original pasados a ml/frame
    let downInc = (res.flowR / PM_CONV) * (120 / 144)
    let upInc = (res.flowL / PM_CONV) * (120 / 144)
    const frames = n * (Math.ceil(strokeVolume / downInc) + Math.ceil(strokeVolume / upInc))
    if (frames > MAX_FRAMES) {
      const k = frames / MAX_FRAMES
      downInc *= k
      upInc *= k
    }
    job.current = {
      strokes: n,
      done: 0,
      dir: 'down',
      vol: volStart,
      start: volStart,
      end: volEnd,
      downInc,
      upInc,
      auto,
      flow: res.flow,
      rate: res.rate
    }
    setChamber(volStart)
    setValves({ L: false, R: true })
    setResult(null)
    setRecordable(false)
    setCanRefill(true)
    setStrokesLeft(n)
    setPhase('pumping')
  }

  const columns = pumpColumns(t)
  const label = (name: string): string => t(`sets.${name}`, { defaultValue: name })
  const current = store.sets[store.selected]

  return (
    <div className="grid grid-cols-1 gap-3 p-3">
      <ToolbarPortal>
        <ExperimentTools
          lab={t('title')}
          experiment={t('experiments.pm')}
          columns={columns}
          rows={current?.rows ?? []}
          plotDefaults={{ x: 'radiusR', y: 'flow' }}
          printableData={<PrintDataSets sets={store.sets} columns={columns} label={label} />}
        />
      </ToolbarPortal>

      <Panel className="flex flex-col gap-2">
        <div className="grid grid-cols-3 justify-items-center gap-2">
          <Stepper
            label={t('fields.pressure')}
            display={String(pressureL)}
            disabled={busy}
            edit={{ ...PM.pressureL, value: pressureL, onChange: param(setPressureL) }}
          />
          <Stepper
            label={t('fields.pumpPressure')}
            display={String(pressurePump)}
            disabled={busy}
            edit={{ ...PM.pressurePump, value: pressurePump, onChange: param(setPressurePump) }}
          />
          <Stepper
            label={t('fields.pressure')}
            display={String(pressureR)}
            disabled={busy}
            edit={{ ...PM.pressureR, value: pressureR, onChange: param(setPressureR) }}
          />
        </div>
        <div className="rounded-xl bg-gradient-to-b from-bench-50/15 to-bench-50/5 p-2">
          <PumpApparatus
            levelL={volL / PM_BEAKER}
            levelR={volR / PM_BEAKER}
            pumpFill={chamber / 120}
            radiusL={radiusL}
            radiusR={radiusR}
            valveL={valves.L}
            valveR={valves.R}
          />
        </div>
        <div className="grid grid-cols-3 justify-items-center">
          {[volL, null, volR].map((v, i) =>
            v === null ? (
              <span key={i} />
            ) : (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="text-sm font-semibold text-bench-100">{t('fields.volume')}</span>
                <Readout value={String(Math.round(v))} />
              </div>
            )
          )}
        </div>
      </Panel>

      <Panel className="flex flex-wrap items-start justify-around gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Light on={phase === 'pumping' && job.current?.auto === true} />
            <Button variant="primary" onClick={() => pump(true)} disabled={busy} className="flex-1">
              {t('actions.autoPump')}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Light on={phase === 'pumping' && job.current?.auto === false} />
            <Button onClick={() => pump(false)} disabled={busy} className="flex-1">
              {t('actions.single')}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Light on={phase === 'refilling'} />
            <Button
              onClick={() => {
                setCanRefill(false)
                setPhase('refilling')
              }}
              disabled={busy || !canRefill || volL >= PM_BEAKER}
              className="flex-1"
            >
              {t('actions.refill')}
            </Button>
          </div>
        </div>
        <Stepper
          label={t('fields.maxStrokes')}
          display={String(strokesLeft ?? strokes)}
          disabled={busy}
          edit={{ ...PM.strokes, value: strokes, onChange: setStrokes }}
        />
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm font-semibold text-bench-100">{t('fields.pumpVolume')}</span>
          <Stepper
            label={t('fields.start')}
            display={String(volStart)}
            disabled={busy}
            edit={{ min: volEnd, max: PM.volumeStart.max, step: 1, value: volStart, onChange: param((v) => {
              setVolStart(v)
              setChamber(v)
            }) }}
          />
          <Stepper
            label={t('fields.end')}
            display={String(volEnd)}
            disabled={busy}
            edit={{ min: PM.volumeEnd.min, max: volStart, step: 1, value: volEnd, onChange: param(setVolEnd) }}
          />
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-bench-100">{t('fields.stroke')}</span>
            <Readout value={String(strokeVolume)} />
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm font-semibold text-bench-100">{t('fields.flowTubeRadius')}</span>
          <Stepper
            label={t('fields.radiusL')}
            display={fixed(radiusL, 1)}
            disabled={busy}
            edit={{ ...PM.radius, value: radiusL, onChange: param(setRadiusL) }}
          />
          <Stepper
            label={t('fields.radiusR')}
            display={fixed(radiusR, 1)}
            disabled={busy}
            edit={{ ...PM.radius, value: radiusR, onChange: param(setRadiusR) }}
          />
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm font-semibold text-bench-100">{t('fields.flow')}</span>
          <Readout value={result ? fixed(result.flow, 1) : ''} className="w-32" />
          <span className="text-sm font-semibold text-bench-100">{t('fields.rate')}</span>
          <Readout value={result ? fixed(result.rate, 1) : ''} className="w-32" />
        </div>
      </Panel>

      <Panel>
        <DataSetTable
          store={store}
          columns={columns}
          editable
          label={label}
          canRecord={recordable && result !== null}
          onRecord={() => {
            if (!result) return
            store.addRow({
              flow: result.flow,
              radiusL,
              radiusR,
              strokeVolume,
              rate: result.rate,
              pressureL,
              pressureDif: pressurePump - pressureR
            })
            setRecordable(false)
          }}
        />
      </Panel>

      {alert && <Notice title={t('alerts.title')} lines={[t(`alerts.${alert}`)]} onClose={() => setAlert(null)} />}
    </div>
  )
}

