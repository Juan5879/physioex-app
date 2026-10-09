import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import type { DataColumn } from '@/shared/components/DataTable'
import { DataTable } from '@/shared/components/DataTable'
import { ExperimentTools } from '@/shared/components/ExperimentTools'
import { Stepper } from '@/shared/components/Stepper'
import { Button, Notice } from '@/shared/components/ui'
import { fixed, roundTo } from '@/shared/lib/format'
import { useSweep } from '@/shared/lib/useSweep'
import { DEFAULT_NERVE, Dropper, DRAG_TYPE, LitButton, NerveChamber, NerveScope } from '../components/Bench'
import { NerveLayout } from '../components/NerveLayout'
import {
  ELECTRIC,
  PIXELS,
  PX_PER_DIV,
  STIM_RATE,
  VOLTAGE,
  actionPotential,
  isStimulusPixel,
  repeatedStimulus,
  singleStimulus,
  type TracePoint
} from '../model/nerve'
import { useEniStore, type EniRow, type EniStimulus } from '../store'

/** duración de las animaciones del gotero (9 frames) y de la varilla */
const DRIP_MS = 450
const BAR_MS = 500
const HEAT_MS = 1500
const CLEAN_MS = 600

export function eniColumns(t: TFunction): DataColumn<EniRow>[] {
  const yes = (on: boolean): string => (on ? t('values.yes') : '----')
  return [
    {
      key: 'voltage',
      header: t('columns.voltage'),
      value: (r) => (r.stimulus === 'elec' ? r.voltage : NaN),
      format: (r) => (r.stimulus === 'elec' ? fixed(r.voltage, 1) : '----')
    },
    {
      key: 'glass',
      header: t('columns.glassBar'),
      value: () => NaN,
      format: (r) => yes(r.stimulus === 'Glas' || r.stimulus === 'Heat')
    },
    { key: 'nacl', header: t('columns.NaCl'), value: () => NaN, format: (r) => yes(r.stimulus === 'NaCl') },
    { key: 'hcl', header: t('columns.HCl'), value: () => NaN, format: (r) => yes(r.stimulus === 'HCl') },
    { key: 'heat', header: t('columns.heat'), value: () => NaN, format: (r) => yes(r.stimulus === 'Heat') },
    {
      key: 'ap',
      header: t('columns.actionPotential'),
      value: (r) => (r.actionPotential ? 1 : 0),
      format: (r) => t(r.actionPotential ? 'values.yes' : 'values.no')
    }
  ]
}

type BarState = { pos: 'rack' | 'heater'; hot: boolean; heating: boolean }

/** Experimento 1: provocar un impulso con estímulos eléctricos, químicos, mecánicos y térmicos */
export function Eliciting(): ReactNode {
  const { t } = useTranslation('nerve')
  const s = useEniStore()
  const { voltage, stimRate, scale } = s.params
  const sweep = useSweep<TracePoint[]>()
  const [last, setLast] = useState<EniRow | null>(null)
  const [recorded, setRecorded] = useState<EniRow | null>(null)
  const [unClean, setUnClean] = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const [busy, setBusy] = useState<'NaCl' | 'HCl' | 'bar' | null>(null)
  const [bar, setBar] = useState<BarState>({ pos: 'rack', hot: false, heating: false })
  const [lit, setLit] = useState(false)
  const [alert, setAlert] = useState<string | null>(null)

  const multiRunning = sweep.running
  const locked = multiRunning || busy !== null

  const draw = (points: TracePoint[], row: EniRow): void => {
    s.addTrace(points)
    setLast(row)
  }

  const flash = (): void => {
    setLit(true)
    window.setTimeout(() => setLit(false), 300)
  }

  const singleStim = (): void => {
    if (scale === 'sec') return setAlert('toMsec')
    flash()
    const res = singleStimulus(voltage, ELECTRIC)
    draw(res.points, { stimulus: 'elec', voltage, actionPotential: res.actionPotential })
  }

  const multiStim = (): void => {
    if (scale === 'msec') return setAlert('toSec')
    const { spike, rest } = repeatedStimulus(voltage, ELECTRIC)
    const period = PX_PER_DIV / stimRate
    // un grupo de puntos por píxel: los estímulos se ven como líneas verticales de ±amp
    const pixels = Array.from({ length: PIXELS }, (_, p) => {
      const x = p / PX_PER_DIV
      return spike > 0 && isStimulusPixel(p, period)
        ? [
            { x, y: rest },
            { x, y: -spike },
            { x, y: spike },
            { x, y: rest }
          ]
        : [{ x, y: rest }]
    })
    const id = s.addTrace()
    setLast(null)
    sweep.start(
      pixels,
      3,
      (visible) => s.updateTrace(id, visible.flat()),
      () => undefined
    )
  }

  /** aplica un estímulo químico, mecánico o térmico: el nervio responde con amplitud fija */
  const chemical = (stimulus: EniStimulus, amp: number): void => {
    draw(actionPotential(amp, ELECTRIC.tDelay), { stimulus, voltage, actionPotential: true })
  }

  const applyDrop = (kind: 'NaCl' | 'HCl'): void => {
    if (locked) return
    if (scale === 'sec') return setAlert('toMsec')
    if (unClean) return setAlert('clean')
    setBusy(kind)
    window.setTimeout(() => {
      setBusy(null)
      setUnClean(true)
      chemical(kind, 40)
    }, DRIP_MS)
  }

  const applyBar = (): void => {
    if (locked || bar.heating) return
    if (unClean) return setAlert('clean')
    if (scale === 'sec') {
      setBar({ pos: 'rack', hot: false, heating: false })
      return setAlert('toMsec')
    }
    const hot = bar.hot
    setBusy('bar')
    window.setTimeout(() => {
      setBusy(null)
      setBar({ pos: 'rack', hot: false, heating: false })
      chemical(hot ? 'Heat' : 'Glas', hot ? 43 : 40)
    }, BAR_MS)
  }

  const heat = (): void => {
    setBar((b) => ({ ...b, heating: true }))
    window.setTimeout(() => setBar({ pos: 'heater', hot: true, heating: false }), HEAT_MS)
  }

  const clean = (): void => {
    setUnClean(false)
    setCleaning(true)
    setRecorded(last)
    window.setTimeout(() => setCleaning(false), CLEAN_MS)
  }

  const onDrop = (item: string): void => {
    if (item === 'NaCl' || item === 'HCl') applyDrop(item)
    if (item === 'bar') applyBar()
  }

  const columns = eniColumns(t)
  const xLabel = t(scale === 'msec' ? 'fields.timeMs' : 'fields.timeSec')
  const scope = (light = false): ReactNode => <NerveScope series={s.traces} xLabel={xLabel} light={light} />
  const residue = unClean ? (last?.stimulus === 'HCl' ? '#fde047' : '#93c5fd') : null

  return (
    <>
      <NerveLayout
        tools={
          <ExperimentTools
            lab={t('title')}
            experiment={t('experiments.eni')}
            columns={columns}
            rows={s.rows}
            printableGraph={scope(true)}
          />
        }
        reagents={
          <>
            <Dropper
              label={t('reagents.NaCl')}
              color="#93c5fd"
              item="NaCl"
              onApply={() => applyDrop('NaCl')}
              disabled={locked}
              dripping={busy === 'NaCl'}
            />
            <Dropper
              label={t('reagents.HCl')}
              color="#fde047"
              item="HCl"
              onApply={() => applyDrop('HCl')}
              disabled={locked}
              dripping={busy === 'HCl'}
            />
            {bar.pos === 'rack' && <GlassBar hot={false} onApply={applyBar} disabled={locked} busy={busy === 'bar'} />}
            <div
              className="mt-auto flex flex-col items-center gap-2 rounded-lg border border-bench-500 bg-bench-900 p-2"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                if (e.dataTransfer.getData(DRAG_TYPE) === 'bar' && !locked) setBar((b) => ({ ...b, pos: 'heater' }))
              }}
              onClick={() => bar.pos === 'rack' && !locked && setBar((b) => ({ ...b, pos: 'heater' }))}
              title={t('hints.dragBar')}
            >
              <span className="text-sm font-semibold text-bench-100">{t('panels.heater')}</span>
              {bar.pos === 'heater' && (
                <GlassBar hot={bar.hot} heating={bar.heating} onApply={applyBar} disabled={locked} busy={busy === 'bar'} />
              )}
              <LitButton
                on={bar.heating}
                onClick={(e) => {
                  e.stopPropagation()
                  heat()
                }}
                disabled={bar.pos !== 'heater' || bar.heating || bar.hot || locked}
              >
                {t('actions.heat')}
              </LitButton>
            </div>
          </>
        }
        chamber={
          <>
            <LitButton on={cleaning} onClick={clean} disabled={locked || !unClean}>
              {t('actions.clean')}
            </LitButton>
            <NerveChamber nerveColor={DEFAULT_NERVE} residue={residue} onDrop={onDrop} title={t('panels.chamber')} />
          </>
        }
        scope={scope()}
        scopeActions={
          <>
            <Button
              className="border border-gray-500 bg-gray-100"
              disabled={multiRunning}
              onClick={() => {
                s.clearTraces()
                setLast(null)
                s.setParams({ scale: scale === 'msec' ? 'sec' : 'msec' })
              }}
            >
              {t(scale === 'msec' ? 'fields.timeSec' : 'fields.timeMs')}
            </Button>
            <Button
              className="border border-gray-500 bg-gray-100"
              disabled={multiRunning || s.traces.length === 0}
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
              <LitButton on={lit} variant="primary" onClick={singleStim} disabled={locked}>
                {t('actions.singleStimulus')}
              </LitButton>
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
            <div className="flex flex-col items-center gap-3">
              <LitButton on={multiRunning} variant="primary" onClick={multiStim} disabled={locked}>
                {t('actions.multipleStimulus')}
              </LitButton>
              <Stepper
                label={t('fields.stimRate')}
                display={fixed(stimRate, 1)}
                edit={{ ...STIM_RATE, value: stimRate, onChange: (v) => s.setParams({ stimRate: v }) }}
                disabled={locked}
                canDecrement={stimRate > STIM_RATE.min}
                canIncrement={stimRate < STIM_RATE.max}
                onStep={(d) =>
                  s.setParams((p) => ({
                    stimRate: Math.min(STIM_RATE.max, Math.max(STIM_RATE.min, p.stimRate + d * STIM_RATE.step))
                  }))
                }
              />
            </div>
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

/** Varilla de vidrio arrastrable (al nervio o al calentador) */
function GlassBar({
  hot,
  heating,
  onApply,
  disabled,
  busy
}: {
  hot: boolean
  heating?: boolean
  onApply: () => void
  disabled: boolean
  busy: boolean
}): ReactNode {
  const { t } = useTranslation('nerve')
  return (
    <button
      type="button"
      draggable={!disabled && !heating}
      disabled={disabled || heating}
      onDragStart={(e) => e.dataTransfer.setData(DRAG_TYPE, 'bar')}
      onClick={(e) => {
        e.stopPropagation()
        onApply()
      }}
      title={t('hints.dragBar')}
      className={`flex w-full flex-col items-center gap-1 rounded-lg border border-bench-500 bg-bench-900 p-2 text-sm font-semibold hover:bg-bench-800 disabled:opacity-60 ${busy ? 'animate-pulse' : ''}`}
    >
      <span
        className="block h-3 w-32 rounded-full"
        style={{
          background: hot || heating ? 'linear-gradient(90deg,#fecaca,#f97316,#fecaca)' : 'linear-gradient(90deg,#e0f2fe,#bae6fd,#e0f2fe)',
          transition: `background ${HEAT_MS}ms`
        }}
      />
      {t(hot ? 'reagents.hotBar' : 'reagents.glassBar')}
    </button>
  )
}
