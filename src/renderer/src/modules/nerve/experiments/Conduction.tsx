import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { DataTable, type DataColumn } from '@/shared/components/DataTable'
import { ExperimentTools } from '@/shared/components/ExperimentTools'
import { Stepper } from '@/shared/components/Stepper'
import { Button, Light, Notice } from '@/shared/components/ui'
import { fixed, roundTo } from '@/shared/lib/format'
import { DRAG_TYPE, Dropper, LitButton, NERVE_COLORS, NerveChamber, NerveScope } from '../components/Bench'
import { NerveLayout } from '../components/NerveLayout'
import {
  NCV_DISTANCE,
  NERVE_PARAMS,
  NERVES,
  PIXELS,
  PX_PER_DIV,
  VOLTAGE,
  conductionVelocity,
  singleStimulus,
  type NerveId
} from '../model/nerve'
import { useNcvStore, type NcvRow } from '../store'

const DRIP_MS = 450
/** filas de la tabla del original; no se puede medir con la tabla llena */
const MAX_ROWS = 4

export function ncvColumns(t: TFunction): DataColumn<NcvRow>[] {
  return [
    { key: 'nerve', header: t('columns.nerve'), value: () => NaN, format: (r) => t(`nerves.${r.nerve}`) },
    { key: 'time', header: t('columns.time'), value: (r) => r.time, format: (r) => fixed(r.time) },
    { key: 'distance', header: t('columns.distance'), value: () => NCV_DISTANCE, format: () => String(NCV_DISTANCE) },
    {
      key: 'velocity',
      header: t('columns.velocity'),
      value: (r) => conductionVelocity(r.time) ?? NaN,
      format: (r) => {
        const v = conductionVelocity(r.time)
        return v === null ? t('values.infinite') : t('values.velocity', { v: fixed(v) })
      }
    }
  ]
}

/** 'pulse' = listo para estimular; 'measure' = línea de medición activa */
type Mode = 'none' | 'pulse' | 'measure'

/** Experimento 3: velocidad de conducción en distintos nervios */
export function Conduction(): ReactNode {
  const { t } = useTranslation('nerve')
  const s = useNcvStore()
  const { voltage } = s.params
  const [nerve, setNerve] = useState<NerveId | null>(null)
  const [wormDrunk, setWormDrunk] = useState(false)
  const [dripping, setDripping] = useState(false)
  const [ampOn, setAmpOn] = useState(false)
  const [mode, setMode] = useState<Mode>('none')
  const [canMeasure, setCanMeasure] = useState(false)
  /** posición de la línea de medición en píxeles (1 px = 1/36 ms) */
  const [pix, setPix] = useState(0)
  const [recordable, setRecordable] = useState(false)
  const [lit, setLit] = useState(false)
  const [alert, setAlert] = useState<string | null>(null)

  const pulse = (): void => {
    s.clearTraces()
    setMode('pulse')
    setCanMeasure(false)
    setRecordable(false)
  }

  const stimulate = (): void => {
    if (!ampOn) return setAlert('bioAmp')
    if (!nerve) return setAlert('noNerve')
    const p = NERVE_PARAMS[nerve]
    setLit(true)
    window.setTimeout(() => setLit(false), 300)
    s.addTrace(singleStimulus(voltage, p).points)
    if (voltage >= p.vThresh) setCanMeasure(true)
  }

  const measure = (): void => {
    if (s.rows.length >= MAX_ROWS) return setAlert('dataFull')
    setMode('measure')
    setCanMeasure(false)
    setPix(0)
    setRecordable(true)
  }

  const placeNerve = (id: NerveId): void => {
    if (id === 'worm' && !wormDrunk) return setAlert('squirm')
    setNerve((cur) => (cur === id ? null : id))
  }

  const applyEthanol = (): void => {
    if (wormDrunk) return setAlert('ethanol')
    setDripping(true)
    window.setTimeout(() => {
      setDripping(false)
      setWormDrunk(true)
    }, DRIP_MS)
  }

  const time = mode === 'measure' ? pix / PX_PER_DIV : null
  const columns = ncvColumns(t)
  const scope = (light = false): ReactNode => (
    <NerveScope series={s.traces} xLabel={t('fields.timeMs')} measureX={time} light={light} />
  )

  return (
    <>
      <NerveLayout
        tools={
          <ExperimentTools
            lab={t('title')}
            experiment={t('experiments.ncv')}
            columns={columns}
            rows={s.rows}
            printableGraph={scope(true)}
          />
        }
        reagents={
          <>
            <Dropper
              label={t('reagents.ethanol')}
              color="#bfdbfe"
              item="ethanol"
              onApply={applyEthanol}
              disabled={dripping}
              dripping={dripping}
            />
            <span className="mt-1 text-center text-sm font-semibold text-bench-100">{t('panels.nerves')}</span>
            <div
              className="grid grid-cols-2 gap-2"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                if (e.dataTransfer.getData(DRAG_TYPE) === 'ethanol') applyEthanol()
              }}
            >
              {NERVES.map((id) => {
                const placed = nerve === id
                return (
                  <button
                    key={id}
                    type="button"
                    draggable={!placed}
                    onDragStart={(e) => {
                      if (id === 'worm' && !wormDrunk) {
                        e.preventDefault()
                        setAlert('squirm')
                        return
                      }
                      e.dataTransfer.setData(DRAG_TYPE, id)
                    }}
                    onClick={() => placeNerve(id)}
                    title={t('hints.dragNerve')}
                    className={`flex flex-col items-center gap-1 rounded-lg border p-1.5 text-xs font-semibold ${placed ? 'border-sky-400 bg-bench-800' : 'border-bench-500 bg-bench-900 hover:bg-bench-800'}`}
                  >
                    <svg viewBox="0 0 20 80" className={`h-20 w-5 ${placed ? 'opacity-20' : ''}`}>
                      <path
                        d="M 10 4 C 6 25, 14 45, 9 60 S 10 74, 10 76"
                        fill="none"
                        stroke={NERVE_COLORS[id]}
                        strokeWidth={id === 'rat2' ? 7 : 5}
                        strokeLinecap="round"
                        className={id === 'worm' && !wormDrunk ? 'origin-center animate-pulse' : ''}
                      />
                    </svg>
                    {t(`nerves.${id}`)}
                  </button>
                )
              })}
            </div>
            <div className="mt-auto flex flex-col items-center gap-2 rounded-lg border border-bench-500 bg-bench-900 p-2">
              <span className="text-sm font-semibold text-bench-100">{t('panels.bioAmp')}</span>
              <div className="flex flex-col gap-1">
                {([true, false] as const).map((on) => (
                  <button
                    key={String(on)}
                    type="button"
                    onClick={() => setAmpOn(on)}
                    className={`flex items-center gap-1.5 rounded px-2 py-1 text-sm font-semibold ${ampOn === on ? 'bg-bench-600 text-white' : 'text-bench-300 hover:bg-bench-800'}`}
                  >
                    <Light on={ampOn === on && on} />
                    {t(on ? 'actions.on' : 'actions.off')}
                  </button>
                ))}
              </div>
            </div>
          </>
        }
        chamber={
          <NerveChamber
            nerveColor={nerve ? NERVE_COLORS[nerve] : null}
            onDrop={(item) => (NERVES as string[]).includes(item) && placeNerve(item as NerveId)}
            onClick={nerve ? () => setNerve(null) : undefined}
            title={nerve ? t(`nerves.${nerve}`) : t('nerves.none')}
          />
        }
        scope={scope()}
        scopeActions={
          <Button className="border border-gray-500 bg-gray-100" onClick={pulse}>
            {t('actions.clear')}
          </Button>
        }
        stimulator={
          <div className="flex flex-wrap items-end justify-around gap-4">
            <div className="flex flex-col items-center gap-3">
              <LitButton on={lit} variant="primary" onClick={stimulate} disabled={mode !== 'pulse'}>
                {t('actions.stimulate')}
              </LitButton>
              <Stepper
                label={t('fields.voltage')}
                display={fixed(voltage, 1)}
                edit={{ ...VOLTAGE, value: voltage, onChange: (v) => s.setParams({ voltage: v }) }}
                canDecrement={voltage > VOLTAGE.min}
                canIncrement={voltage < VOLTAGE.max}
                onStep={(d) =>
                  s.setParams((p) => ({
                    voltage: Math.min(VOLTAGE.max, Math.max(VOLTAGE.min, roundTo(p.voltage + d * VOLTAGE.step, 1)))
                  }))
                }
              />
            </div>
            <LitButton on={mode === 'pulse'} onClick={pulse} disabled={mode === 'pulse' && s.traces.length === 0}>
              {t('actions.pulse')}
            </LitButton>
            <div className="flex flex-col items-center gap-3" title={t('hints.measure')}>
              <Button onClick={measure} disabled={!canMeasure || mode !== 'pulse'}>
                {t('actions.measure')}
              </Button>
              <Stepper
                label={t('fields.measureTime')}
                arrows
                display={time !== null ? fixed(time) : '----'}
                edit={{
                  value: time ?? 0,
                  min: 0,
                  max: (PIXELS - 1) / PX_PER_DIV,
                  step: 1 / PX_PER_DIV,
                  onChange: (v) => setPix(Math.round(v * PX_PER_DIV))
                }}
                disabled={mode !== 'measure'}
                canDecrement={pix > 0}
                canIncrement={pix < PIXELS - 1}
                onStep={(d) => setPix((p) => Math.min(PIXELS - 1, Math.max(0, p + d)))}
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
              if (nerve && time !== null) s.addRow({ nerve, time: roundTo(time, 2) })
              setRecordable(false)
            }}
            onDelete={s.deleteRow}
            onClear={s.clearRows}
            canRecord={recordable && nerve !== null && s.rows.length < MAX_ROWS}
          />
        }
      />
      {alert && <Notice title={t('alerts.title')} lines={[t(`alerts.${alert}`)]} onClose={() => setAlert(null)} />}
    </>
  )
}
