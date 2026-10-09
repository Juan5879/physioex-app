import { useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { DataTable, type DataColumn } from '@/shared/components/DataTable'
import { ExperimentTools } from '@/shared/components/ExperimentTools'
import { Stepper } from '@/shared/components/Stepper'
import { Button, Notice, Readout } from '@/shared/components/ui'
import { fixed, roundTo } from '@/shared/lib/format'
import { useFrameLoop } from '@/shared/lib/useFrameLoop'
import { DEFAULT_NERVE, Dropper, LitButton, NerveChamber, NerveScope } from '../components/Bench'
import { NerveLayout } from '../components/NerveLayout'
import {
  ELECTRIC,
  INTERVAL,
  PIXELS,
  PX_PER_DIV,
  VOLTAGE,
  isStimulusPixel,
  repeatedStimulus,
  singleStimulus,
  type TracePoint
} from '../model/nerve'
import { useIniStore, type Inhibitor, type IniRow } from '../store'

const DRIP_MS = 450
const CLEAN_MS = 600
/** el éter deja de bloquear a los 5 minutos (180 px en escala de minutos) */
const ETHER_WEARS_OFF = 180

const INHIBITORS: Array<{ id: Inhibitor; key: string; color: string }> = [
  { id: 'Lido', key: 'reagents.lido', color: '#c4b5fd' },
  { id: 'Cura', key: 'reagents.cura', color: '#fdba74' },
  { id: 'Ethr', key: 'reagents.ethr', color: '#e5e7eb' }
]

export function iniColumns(t: TFunction): DataColumn<IniRow>[] {
  const presence = (id: Inhibitor) => (r: IniRow) => t(r.inhibitor === id ? 'values.present' : 'values.absent')
  return [
    { key: 'voltage', header: t('columns.voltage'), value: (r) => r.voltage, format: (r) => fixed(r.voltage, 1) },
    { key: 'ether', header: t('columns.ether'), value: () => NaN, format: presence('Ethr') },
    { key: 'curare', header: t('columns.curare'), value: () => NaN, format: presence('Cura') },
    { key: 'lido', header: t('columns.lidocaine'), value: () => NaN, format: presence('Lido') },
    {
      key: 'ap',
      header: t('columns.actionPotential'),
      value: (r) => (r.actionPotential ? 1 : 0),
      format: (r) => t(r.actionPotential ? 'values.yes' : 'values.no')
    }
  ]
}

/** Barrido de estímulos repetidos (f_nextRepeatStim): 1 píxel por frame, sin fin hasta "Detener" */
interface RepeatJob {
  traceId: number
  points: TracePoint[]
  pix: number
  timeCount: number
  period: number
  spike: number
  rest: number
  inhibitor: Inhibitor | null
}

/** Experimento 2: inhibir el impulso con éter, curare y lidocaína */
export function Inhibiting(): ReactNode {
  const { t } = useTranslation('nerve')
  const s = useIniStore()
  const { voltage, interval, scale } = s.params
  const [inhibitor, setInhibitor] = useState<Inhibitor | null>(null)
  const [unClean, setUnClean] = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const [dripping, setDripping] = useState<Inhibitor | null>(null)
  const [last, setLast] = useState<IniRow | null>(null)
  const [recorded, setRecorded] = useState<IniRow | null>(null)
  const [repeating, setRepeating] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [lit, setLit] = useState(false)
  const [alert, setAlert] = useState<string | null>(null)
  const job = useRef<RepeatJob | null>(null)

  useFrameLoop(repeating, () => {
    const j = job.current
    if (!j) return
    if (j.pix >= PIXELS) {
      // al llegar al borde se borra la pantalla y el barrido vuelve a empezar
      j.points = []
      j.pix = 0
    }
    const x = j.pix / PX_PER_DIV
    const fires =
      j.inhibitor === null || j.inhibitor === 'Cura' || (j.inhibitor === 'Ethr' && j.timeCount > ETHER_WEARS_OFF)
    if (fires && j.spike > 0 && isStimulusPixel(j.pix, j.period)) {
      j.points.push({ x, y: j.rest }, { x, y: -j.spike }, { x, y: j.spike }, { x, y: j.rest })
    } else {
      j.points.push({ x, y: j.rest })
    }
    j.pix += 1
    j.timeCount += 1
    s.updateTrace(j.traceId, [...j.points])
    setElapsed(j.timeCount / PX_PER_DIV)
  })

  const stimulate = (): void => {
    if (interval === 0) {
      if (scale === 'min') return setAlert('minToMsec')
      setLit(true)
      window.setTimeout(() => setLit(false), 300)
      const blocked = inhibitor === 'Ethr' || inhibitor === 'Lido'
      const res = singleStimulus(voltage, ELECTRIC, blocked)
      s.addTrace(res.points)
      setLast({ voltage, inhibitor, actionPotential: res.actionPotential })
      return
    }
    if (scale === 'msec') return setAlert('msecToMin')
    const { spike, rest } = repeatedStimulus(voltage, ELECTRIC)
    s.clearTraces()
    job.current = {
      traceId: s.addTrace(),
      points: [],
      pix: 0,
      timeCount: 0,
      period: PX_PER_DIV * interval,
      spike,
      rest,
      inhibitor
    }
    setElapsed(0)
    setRepeating(true)
  }

  const stop = (): void => {
    setRepeating(false)
    job.current = null
    setElapsed(0)
  }

  const applyInhibitor = (id: Inhibitor): void => {
    if (dripping || repeating) return
    if (unClean) return setAlert('clean')
    setDripping(id)
    window.setTimeout(() => {
      setDripping(null)
      setUnClean(true)
      setInhibitor(id)
    }, DRIP_MS)
  }

  const clean = (): void => {
    setUnClean(false)
    setInhibitor(null)
    setCleaning(true)
    setRecorded(last)
    window.setTimeout(() => setCleaning(false), CLEAN_MS)
  }

  const locked = repeating || dripping !== null
  const columns = iniColumns(t)
  const xLabel = t(scale === 'msec' ? 'fields.timeMs' : 'fields.timeMin')
  const scope = (light = false): ReactNode => <NerveScope series={s.traces} xLabel={xLabel} light={light} />
  const residue = inhibitor ? INHIBITORS.find((i) => i.id === inhibitor)?.color : null

  return (
    <>
      <NerveLayout
        tools={
          <ExperimentTools
            lab={t('title')}
            experiment={t('experiments.ini')}
            columns={columns}
            rows={s.rows}
            printableGraph={scope(true)}
          />
        }
        reagents={INHIBITORS.map((i) => (
          <Dropper
            key={i.id}
            label={t(i.key)}
            color={i.color}
            item={i.id}
            onApply={() => applyInhibitor(i.id)}
            disabled={locked}
            dripping={dripping === i.id}
          />
        ))}
        chamber={
          <>
            <LitButton on={cleaning} onClick={clean} disabled={locked || !unClean}>
              {t('actions.clean')}
            </LitButton>
            <NerveChamber
              nerveColor={DEFAULT_NERVE}
              residue={residue}
              onDrop={(item) => INHIBITORS.some((i) => i.id === item) && applyInhibitor(item as Inhibitor)}
              title={t('panels.chamber')}
            />
          </>
        }
        scope={scope()}
        scopeActions={
          <>
            <Button
              className="border border-gray-500 bg-gray-100"
              disabled={repeating}
              onClick={() => {
                s.clearTraces()
                setLast(null)
                s.setParams({ scale: scale === 'msec' ? 'min' : 'msec' })
              }}
            >
              {t(scale === 'msec' ? 'fields.timeMin' : 'fields.timeMs')}
            </Button>
            <Button
              className="border border-gray-500 bg-gray-100"
              disabled={repeating || s.traces.length === 0}
              onClick={() => {
                s.clearTraces()
                setLast(null)
              }}
            >
              {t('actions.clear')}
            </Button>
          </>
        }
        stimulator={
          <div className="flex flex-wrap items-end justify-around gap-4">
            <div className="flex flex-col items-center gap-3">
              <div className="flex gap-3">
                <LitButton on={lit || repeating} variant="primary" onClick={stimulate} disabled={locked}>
                  {t('actions.stimulate')}
                </LitButton>
                <LitButton on={!repeating && scale === 'min'} onClick={stop} disabled={!repeating}>
                  {t('actions.stop')}
                </LitButton>
              </div>
              <Stepper
                label={t('fields.voltage')}
                display={fixed(voltage, 1)}
                edit={{ ...VOLTAGE, value: voltage, onChange: (v) => s.setParams({ voltage: v }) }}
                disabled={locked}
                canDecrement={voltage > VOLTAGE.min}
                canIncrement={voltage < VOLTAGE.max}
                onStep={(d) =>
                  s.setParams((p) => ({
                    voltage: Math.min(VOLTAGE.max, Math.max(VOLTAGE.min, roundTo(p.voltage + d * VOLTAGE.step, 1)))
                  }))
                }
              />
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-sm font-semibold text-bench-100">{t('fields.elapsed')}</span>
              <Readout value={fixed(elapsed, 2)} />
            </div>
            <Stepper
              label={t('fields.interval')}
              display={fixed(interval, 1)}
              edit={{ ...INTERVAL, value: interval, onChange: (v) => s.setParams({ interval: v }) }}
              disabled={locked}
              canDecrement={interval > INTERVAL.min}
              canIncrement={interval < INTERVAL.max}
              onStep={(d) =>
                s.setParams((p) => ({
                  interval: Math.min(INTERVAL.max, Math.max(INTERVAL.min, p.interval + d * INTERVAL.step))
                }))
              }
            />
          </div>
        }
        table={
          <DataTable
            columns={columns}
            rows={s.rows}
            selected={s.selected}
            onSelect={s.select}
            onRecord={() => {
              if (last) s.addRow(last)
              setRecorded(last)
            }}
            onDelete={s.deleteRow}
            onClear={s.clearRows}
            canRecord={!locked && last !== null && last !== recorded}
          />
        }
      />
      {alert && <Notice title={t('alerts.title')} lines={[t(`alerts.${alert}`)]} onClose={() => setAlert(null)} />}
    </>
  )
}
