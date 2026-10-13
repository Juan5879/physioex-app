import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { DataTable, type DataColumn } from '@/shared/components/DataTable'
import { ExperimentTools } from '@/shared/components/ExperimentTools'
import { Stepper } from '@/shared/components/Stepper'
import { Button, Light, Notice, Seg } from '@/shared/components/ui'
import { fixed, roundTo, splitUnit } from '@/shared/lib/format'
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
              color="var(--scale-4)"
              item="ethanol"
              onApply={applyEthanol}
              disabled={dripping}
              dripping={dripping}
            />
            <span className="px-label">{t('panels.nerves')}</span>
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
                    aria-pressed={placed}
                    className="px-option"
                  >
                    <svg viewBox="0 0 20 80" className={`h-20 w-5 ${placed ? 'opacity-20' : ''}`}>
                      <path
                        d="M 10 4 C 6 25, 14 45, 9 60 S 10 74, 10 76"
                        fill="none"
                        style={{ stroke: NERVE_COLORS[id] }}
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
            <div className="px-section">
              <div className="px-row">
                <span className="px-panel__title">{t('panels.bioAmp')}</span>
                <Light on={ampOn} label={t(ampOn ? 'actions.on' : 'actions.off')} />
              </div>
              <Seg
                label={t('panels.bioAmp')}
                value={ampOn ? 'on' : 'off'}
                options={[
                  { value: 'on', label: t('actions.on') },
                  { value: 'off', label: t('actions.off') }
                ]}
                onChange={(v) => setAmpOn(v === 'on')}
              />
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
          <Button size="sm" icon="eraser" onClick={pulse}>
            {t('actions.clear')}
          </Button>
        }
        stimulator={
          <>
            <div className="grid gap-3">
              <Stepper
                block
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
              <LitButton on={lit} variant="primary" onClick={stimulate} disabled={mode !== 'pulse'}>
                {t('actions.stimulate')}
              </LitButton>
              <LitButton on={mode === 'pulse'} onClick={pulse} disabled={mode === 'pulse' && s.traces.length === 0}>
                {t('actions.pulse')}
              </LitButton>
            </div>
            <div className="px-section" title={t('hints.measure')}>
              <span className="px-panel__title">{splitUnit(t('fields.measureTime'))?.text ?? t('fields.measureTime')}</span>
              <Stepper
                unit={splitUnit(t('fields.measureTime'))?.unit}
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
              <Button size="sm" block onClick={measure} disabled={!canMeasure || mode !== 'pulse'}>
                {t('actions.measure')}
              </Button>
            </div>
          </>
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
