import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { DataTable } from '@/shared/components/DataTable'
import { ExperimentTools } from '@/shared/components/ExperimentTools'
import { Oscilloscope, ticks } from '@/shared/components/Oscilloscope'
import { Stepper } from '@/shared/components/Stepper'
import { Button, Light } from '@/shared/components/ui'
import { fixed, roundTo } from '@/shared/lib/format'
import { useSweep } from '@/shared/lib/useSweep'
import { Apparatus } from '../components/Apparatus'
import { forceColumns } from '../components/columns'
import { ClearButton, ExperimentLayout, ForceReadouts, TimeScaleSelect } from '../components/ExperimentLayout'
import { activeScale, passiveForce, voltageRecruitment, type TracePoint } from '../model/common'
import { L_MAX, L_MIN, V_DISPLAY_MAX } from '../model/constants'
import { simulateTwitch, twitchActiveForce } from '../model/twitch'
import { useSingleStore, type ForceRow } from '../store'

const SAMPLES = 360
const Y_MAX = 3

/** Experimento 1: estímulo único (umbral, reclutamiento, periodo latente) */
export function SingleStimulus(): ReactNode {
  const { t } = useTranslation('muscle')
  const tc = useTranslation().t
  const s = useSingleStore()
  const { voltage, length, tMax } = s.params
  const sweep = useSweep<TracePoint>()
  const [stimulusId, setStimulusId] = useState(0)
  const [last, setLast] = useState<ForceRow | null>(null)
  // el original desactivaba "Registrar datos" tras registrar un resultado
  const [recorded, setRecorded] = useState<ForceRow | null>(null)
  const [measure, setMeasure] = useState<{ index: number; row: ForceRow } | null>(null)

  const passive = passiveForce(length)
  const running = sweep.running

  const stimulate = (): void => {
    setMeasure(null)
    setLast(null)
    const result = simulateTwitch({ voltage, length, tMax, samples: SAMPLES })
    const id = s.addTrace()
    if (voltage > 0) setStimulusId((n) => n + 1)
    // el original calculaba 8 puntos por frame
    sweep.start(
      result.points,
      8,
      (visible) => s.updateTrace(id, visible.map((p) => ({ x: p.t, y: p.force }))),
      () =>
        setLast({
          voltage,
          length,
          active: result.activeMax,
          passive: result.passive,
          total: result.totalMax
        })
    )
  }

  // línea de medición: fuerza en el instante t del último estímulo
  const measureTime = measure ? (tMax / SAMPLES) * measure.index : null
  let measured: { active: number; total: number } | null = null
  if (measure && measureTime !== null) {
    const vrr = voltageRecruitment(measure.row.voltage)
    const act = twitchActiveForce(measureTime, vrr, activeScale(measure.row.length))
    measured = { active: act, total: act + measure.row.passive }
  }

  const columns = forceColumns(t)
  const scope = (light = false): ReactNode => (
    <Oscilloscope
      xMax={tMax}
      yMax={Y_MAX}
      xTicks={ticks(0, tMax, 10).map((v) => Math.round(v))}
      yTicks={[0, 1, 2, 3]}
      xLabel={t('fields.time')}
      yLabel={t('fields.force')}
      series={s.traces}
      markerY={passive}
      markerTitle={t('hints.passiveArrow')}
      measureX={measureTime}
      light={light}
    />
  )

  return (
    <>
      <ExperimentLayout
        tools={
          <ExperimentTools
            lab={t('title')}
            experiment={t('experiments.single')}
            columns={columns}
            rows={s.rows}
            plotDefaults={{ x: 'voltage', y: 'active' }}
            printableGraph={scope(true)}
          />
        }
        apparatus={<Apparatus length={length} stimulusId={stimulusId} />}
        apparatusControls={
          <Stepper
            label={t('fields.muscleLength')}
            display={String(length)}
            disabled={running}
            canDecrement={length > L_MIN}
            canIncrement={length < L_MAX}
            onStep={(d) => s.setParams((p) => ({ length: Math.min(L_MAX, Math.max(L_MIN, p.length + d)) }))}
          />
        }
        scope={scope()}
        scopeActions={
          <>
            <TimeScaleSelect value={tMax} onChange={(v) => s.setParams({ tMax: v })} disabled={running} />
            <ClearButton
              onClick={() => {
                s.clearTraces()
                setMeasure(null)
              }}
              disabled={running || s.traces.length === 0}
            >
              {tc('common.clearTracings')}
            </ClearButton>
          </>
        }
        stimulator={
          <div className="flex flex-wrap items-start justify-around gap-4">
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2">
                <Light on={running} />
                <Button variant="primary" onClick={stimulate} disabled={running}>
                  {tc('common.stimulate')}
                </Button>
              </div>
              <Stepper
                label={t('fields.voltage')}
                display={fixed(voltage, 1)}
                disabled={running}
                canDecrement={voltage > 0}
                canIncrement={voltage < V_DISPLAY_MAX}
                onStep={(d) =>
                  s.setParams((p) => ({ voltage: Math.min(V_DISPLAY_MAX, Math.max(0, roundTo(p.voltage + d * 0.1, 1))) }))
                }
              />
            </div>
            <ForceReadouts
              passive={fixed(passive)}
              active={measured ? fixed(measured.active) : last ? fixed(last.active) : ''}
              total={measured ? fixed(measured.total) : last ? fixed(last.total) : ''}
            />
            <div className="flex flex-col items-center gap-3" title={t('hints.measure')}>
              <Button
                onClick={() => setMeasure(measure ? null : last ? { index: 0, row: last } : null)}
                disabled={running || !last}
                variant={measure ? 'primary' : 'secondary'}
              >
                {tc('common.measure')}
              </Button>
              <Stepper
                label={t('fields.time')}
                arrows
                display={measureTime !== null ? fixed(measureTime) : '----'}
                disabled={!measure}
                canDecrement={(measure?.index ?? 0) > 0}
                canIncrement={(measure?.index ?? SAMPLES) < SAMPLES}
                onStep={(d) =>
                  setMeasure((m) => (m ? { ...m, index: Math.min(SAMPLES, Math.max(0, m.index + d)) } : m))
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
            canRecord={!running && last !== null && last !== recorded}
          />
        }
      />
    </>
  )
}
