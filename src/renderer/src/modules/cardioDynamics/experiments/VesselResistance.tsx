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
import { VesselApparatus } from '../components/Apparatus'
import { BEAKER_PX, TUBE_PX_PER_MM, VR, VR_CONV, round1, vesselFlow, type VesselAlert } from '../model/cardio'
import { useVesselSets, type VesselRow } from '../store'

/** la corrida más lenta dura a lo sumo 10 s (el original podía tardar minutos con flujos bajos) */
const MAX_FRAMES = 200
/** el rellenado del original usaba un flujo de 200 */
const REFILL_FLOW = 200

export function vesselColumns(t: TFunction): DataColumn<VesselRow>[] {
  return [
    { key: 'flow', header: t('columns.flow'), value: (r) => r.flow, format: (r) => fixed(r.flow, 1) },
    { key: 'radius', header: t('columns.radius'), value: (r) => r.radius, format: (r) => fixed(r.radius, 1) },
    { key: 'viscosity', header: t('columns.viscosity'), value: (r) => r.viscosity, format: (r) => fixed(r.viscosity, 1) },
    { key: 'length', header: t('columns.length'), value: (r) => r.length, format: (r) => String(r.length) },
    { key: 'pressure', header: t('columns.pressure'), value: (r) => r.pressure, format: (r) => String(r.pressure) }
  ]
}

type Phase = 'ready' | 'running' | 'done' | 'refilling'

/** Las tres etapas de la animación: llenar el tubo, pasar el vaso, vaciar el tubo */
interface Anim {
  fillFrames: number
  beakerFrames: number
  frame: number
}

function makeAnim(flow: number, length: number): Anim {
  const tubePx = length * TUBE_PX_PER_MM
  let fillFrames = Math.max(1, Math.ceil(tubePx / ((flow * 60) / VR_CONV)))
  let beakerFrames = Math.max(1, Math.ceil(BEAKER_PX / (flow / VR_CONV)))
  const total = fillFrames * 2 + beakerFrames
  if (total > MAX_FRAMES) {
    const k = MAX_FRAMES / total
    fillFrames = Math.max(1, Math.round(fillFrames * k))
    beakerFrames = Math.max(1, Math.round(beakerFrames * k))
  }
  return { fillFrames, beakerFrames, frame: 0 }
}

/** posición de la animación: nivel del vaso izquierdo y llenado del tubo */
function animState(a: Anim, reverse: boolean): { left: number; tube: number; fromRight: boolean; done: boolean } {
  const { fillFrames: F, beakerFrames: B, frame } = a
  const done = frame >= F * 2 + B
  let left: number
  let tube: number
  let fromRight: boolean
  if (frame < F) {
    tube = frame / F
    left = 1
    fromRight = false
  } else if (frame < F + B) {
    tube = 1
    left = 1 - (frame - F) / B
    fromRight = false
  } else {
    tube = Math.max(0, 1 - (frame - F - B) / F)
    left = 0
    fromRight = true
  }
  // el rellenado recorre el mismo camino al revés
  if (reverse) return { left: 1 - left, tube, fromRight: !fromRight, done }
  return { left, tube, fromRight, done }
}

/** Experimento 1: efecto del radio, la viscosidad, la longitud y la presión sobre el flujo */
export function VesselResistance(): ReactNode {
  const { t } = useTranslation('cardioDynamics')
  const tc = useTranslation().t
  const store = useVesselSets()
  const [pressure, setPressure] = useState<number>(VR.pressure.initial)
  const [radius, setRadius] = useState<number>(VR.radius.initial)
  const [viscosity, setViscosity] = useState<number>(VR.viscosity.initial)
  const [length, setLength] = useState<number>(VR.length.initial)
  const [phase, setPhase] = useState<Phase>('ready')
  const [flow, setFlow] = useState<number | null>(null)
  const [recordable, setRecordable] = useState(false)
  const [alert, setAlert] = useState<VesselAlert | null>(null)
  const [, setTick] = useState(0)
  const anim = useRef<Anim | null>(null)
  const result = useRef(0)

  const busy = phase === 'running' || phase === 'refilling'

  useFrameLoop(busy, () => {
    const a = anim.current
    if (!a) return
    a.frame += 1
    const st = animState(a, phase === 'refilling')
    if (st.done) {
      if (phase === 'running') {
        setFlow(round1(result.current))
        setRecordable(true)
        setPhase('done')
      } else {
        anim.current = null
        setPhase('ready')
      }
    }
    setTick((n) => n + 1)
  })

  const changed = (): void => {
    setFlow(null)
    setRecordable(false)
  }
  const param = (set: (v: number) => void) => (v: number) => {
    set(v)
    changed()
  }

  const start = (): void => {
    const res = vesselFlow({ pressure, radius, viscosity, length })
    if (res.alert) {
      setAlert(res.alert)
      return
    }
    result.current = res.flow
    anim.current = makeAnim(res.flow, length)
    setFlow(null)
    setRecordable(false)
    setPhase('running')
  }

  const refill = (): void => {
    anim.current = makeAnim(REFILL_FLOW, length)
    if (flow === null) setRecordable(false)
    setPhase('refilling')
  }

  const view = anim.current
    ? animState(anim.current, phase === 'refilling')
    : { left: 1, tube: 0, fromRight: false, done: false }
  const columns = vesselColumns(t)
  const label = (name: string): string => t(`sets.${name}`, { defaultValue: name })
  const current = store.sets[store.selected]

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_260px] gap-3 p-3">
      <ToolbarPortal>
        <ExperimentTools
          lab={t('title')}
          experiment={t('experiments.vr')}
          columns={columns}
          rows={current?.rows ?? []}
          plotDefaults={{ x: 'radius', y: 'flow' }}
          printableData={<PrintDataSets sets={store.sets} columns={columns} label={label} />}
        />
      </ToolbarPortal>

      <Panel className="flex flex-col gap-2">
        <div className="flex justify-start pl-4">
          <Stepper
            label={t('fields.pressure')}
            display={String(pressure)}
            disabled={busy}
            edit={{ ...VR.pressure, value: pressure, onChange: param(setPressure) }}
          />
        </div>
        <div className="rounded-xl bg-gradient-to-b from-bench-50/15 to-bench-50/5 p-2">
          <VesselApparatus
            radius={radius}
            length={length}
            leftLevel={view.left}
            tubeFill={view.tube}
            tubeFillFromRight={view.fromRight}
          />
        </div>
      </Panel>

      <Panel className="flex flex-col justify-center gap-3">
        <div className="flex items-center gap-2">
          <Light on={phase === 'running'} />
          <Button variant="primary" onClick={start} disabled={phase !== 'ready'} className="flex-1">
            {t('actions.start')}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Light on={phase === 'refilling'} />
          <Button onClick={refill} disabled={phase !== 'done'} className="flex-1">
            {t('actions.refill')}
          </Button>
        </div>
        <div className="mt-2 flex flex-col items-center gap-1">
          <span className="text-sm font-semibold text-bench-100">{t('fields.flow')}</span>
          <Readout
            value={phase === 'running' ? tc('common.measuring') : flow !== null ? fixed(flow, 1) : ''}
            className="w-32"
          />
        </div>
      </Panel>

      <Panel className="col-span-2 flex flex-wrap items-end justify-around gap-4">
        <Stepper
          label={t('fields.radius')}
          display={fixed(radius, 1)}
          disabled={busy}
          edit={{ ...VR.radius, value: radius, onChange: param(setRadius) }}
        />
        <Stepper
          label={t('fields.viscosity')}
          display={fixed(viscosity, 1)}
          disabled={busy}
          edit={{ ...VR.viscosity, value: viscosity, onChange: param(setViscosity) }}
        />
        <Stepper
          label={t('fields.length')}
          display={String(length)}
          disabled={busy}
          edit={{ ...VR.length, value: length, onChange: param(setLength) }}
        />
      </Panel>

      <Panel className="col-span-2">
        <DataSetTable
          store={store}
          columns={columns}
          editable
          label={label}
          canRecord={recordable && flow !== null}
          onRecord={() => {
            if (flow === null) return
            store.addRow({ flow, radius, viscosity, length, pressure })
            setRecordable(false)
          }}
        />
      </Panel>

      {alert && <Notice title={t('alerts.title')} lines={[t(`alerts.${alert}`)]} onClose={() => setAlert(null)} />}
    </div>
  )
}
