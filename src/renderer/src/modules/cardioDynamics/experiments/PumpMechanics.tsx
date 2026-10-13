import { useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import type { DataColumn } from '@/shared/components/DataTable'
import { DataSetTable, PrintDataSets } from '@/shared/components/DataSetTable'
import { ExperimentTools } from '@/shared/components/ExperimentTools'
import { Stepper } from '@/shared/components/Stepper'
import { ToolbarPortal } from '@/shared/components/ToolbarSlot'
import { Button, Light, Notice, Panel, ReadoutField } from '@/shared/components/ui'
import { fixed, splitUnit } from '@/shared/lib/format'
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
  const tc = useTranslation().t
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
    <>
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

      <div className="grid grid-cols-[240px_minmax(0,1fr)_240px] items-start gap-4">
        <Panel title={t('panels.parameters')}>
          <Stepper
            block
            label={t('fields.pressureL')}
            display={String(pressureL)}
            disabled={busy}
            edit={{ ...PM.pressureL, value: pressureL, onChange: param(setPressureL) }}
          />
          <Stepper
            block
            label={t('fields.pumpPressure')}
            display={String(pressurePump)}
            disabled={busy}
            edit={{ ...PM.pressurePump, value: pressurePump, onChange: param(setPressurePump) }}
          />
          <Stepper
            block
            label={t('fields.pressureR')}
            display={String(pressureR)}
            disabled={busy}
            edit={{ ...PM.pressureR, value: pressureR, onChange: param(setPressureR) }}
          />
          <div className="px-section">
            <span className="px-panel__title">{splitUnit(t('fields.flowTubeRadius'))?.text}</span>
            <Stepper
              block
              label={t('fields.radiusL')}
              display={fixed(radiusL, 1)}
              disabled={busy}
              edit={{ ...PM.radius, value: radiusL, onChange: param(setRadiusL) }}
            />
            <Stepper
              block
              label={t('fields.radiusR')}
              display={fixed(radiusR, 1)}
              disabled={busy}
              edit={{ ...PM.radius, value: radiusR, onChange: param(setRadiusR) }}
            />
          </div>
        </Panel>

        <Panel title={t('panels.apparatus')} actions={<span className="px-eyebrow">{t('panels.sourceToDest')}</span>}>
          <div className="px-well p-4">
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
          <div className="grid grid-cols-2 gap-4">
            <ReadoutField label={`${splitUnit(t('fields.volume'))?.text} · ${t('panels.source')}`} unit="ml" value={String(Math.round(volL))} />
            <ReadoutField
              label={`${splitUnit(t('fields.volume'))?.text} · ${t('panels.dest')}`}
              unit="ml"
              value={String(Math.round(volR))}
              className="justify-self-end"
            />
          </div>
          <div className="px-section">
            <span className="px-panel__title">{splitUnit(t('fields.pumpVolume'))?.text}</span>
            <div className="flex flex-wrap items-end gap-4">
              <Stepper
                label={t('fields.start')}
                unit="ml"
                display={String(volStart)}
                disabled={busy}
                edit={{
                  min: volEnd,
                  max: PM.volumeStart.max,
                  step: 1,
                  value: volStart,
                  onChange: param((v) => {
                    setVolStart(v)
                    setChamber(v)
                  })
                }}
              />
              <Stepper
                label={t('fields.end')}
                unit="ml"
                display={String(volEnd)}
                disabled={busy}
                edit={{ min: PM.volumeEnd.min, max: volStart, step: 1, value: volEnd, onChange: param(setVolEnd) }}
              />
              <ReadoutField label={t('fields.stroke')} unit="ml" value={String(strokeVolume)} />
            </div>
          </div>
        </Panel>

        <Panel
          title={t('panels.pump')}
          actions={<Light on={phase !== 'ready'} label={tc(phase === 'ready' ? 'common.ready' : 'common.inProgress')} />}
        >
          <Stepper
            block
            label={t('fields.maxStrokes')}
            display={String(strokesLeft ?? strokes)}
            disabled={busy}
            edit={{ ...PM.strokes, value: strokes, onChange: setStrokes }}
          />
          <Button variant="primary" block icon="play" onClick={() => pump(true)} disabled={busy}>
            {t('actions.autoPump')}
          </Button>
          <Button block onClick={() => pump(false)} disabled={busy}>
            {t('actions.single')}
          </Button>
          <Button
            block
            onClick={() => {
              setCanRefill(false)
              setPhase('refilling')
            }}
            disabled={busy || !canRefill || volL >= PM_BEAKER}
          >
            {t('actions.refill')}
          </Button>
          <div className="px-section">
            <ReadoutField inline label={t('fields.flow')} value={result ? fixed(result.flow, 1) : ''} />
            <ReadoutField inline label={t('fields.rate')} value={result ? fixed(result.rate, 1) : ''} />
          </div>
        </Panel>
      </div>

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

      {alert && <Notice title={t('alerts.title')} lines={[t(`alerts.${alert}`)]} onClose={() => setAlert(null)} />}
    </>
  )
}
