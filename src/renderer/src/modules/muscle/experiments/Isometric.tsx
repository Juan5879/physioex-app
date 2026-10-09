import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { DataTable } from '@/shared/components/DataTable'
import { ExperimentTools } from '@/shared/components/ExperimentTools'
import { Oscilloscope } from '@/shared/components/Oscilloscope'
import { Stepper } from '@/shared/components/Stepper'
import { Button, Light } from '@/shared/components/ui'
import { fixed, roundTo } from '@/shared/lib/format'
import { useSweep } from '@/shared/lib/useSweep'
import { Apparatus } from '../components/Apparatus'
import { forceColumns } from '../components/columns'
import { ClearButton, ExperimentLayout, ForceReadouts } from '../components/ExperimentLayout'
import { passiveForce, type TracePoint } from '../model/common'
import { L_MAX, L_MIN, V_DISPLAY_MAX } from '../model/constants'
import { simulateTwitch } from '../model/twitch'
import { useIsometricStore, type ForceRow } from '../store'

const T_MAX = 150
const SAMPLES = 180
const Y_MAX = 3
const COLORS = { active: '#e879f9', passive: '#4ade80', total: '#facc15' }

/** Experimento 3: contracción isométrica (relación longitud–tensión) */
export function Isometric(): ReactNode {
  const { t } = useTranslation('muscle')
  const tc = useTranslation().t
  const s = useIsometricStore()
  const { voltage, length, plot } = s.params
  const sweep = useSweep<TracePoint>()
  const [stimulusId, setStimulusId] = useState(0)
  const [last, setLast] = useState<ForceRow | null>(null)
  // el original desactivaba "Registrar datos" tras registrar un resultado
  const [recorded, setRecorded] = useState<ForceRow | null>(null)

  const passive = passiveForce(length)
  const running = sweep.running

  const stimulate = (): void => {
    setLast(null)
    const result = simulateTwitch({ voltage, length, tMax: T_MAX, samples: SAMPLES })
    const id = s.addTrace()
    if (voltage > 0) setStimulusId((n) => n + 1)
    sweep.start(
      result.points,
      6,
      (visible) => s.updateTrace(id, visible.map((p) => ({ x: p.t, y: p.force }))),
      () => {
        const row = { voltage, length, active: result.activeMax, passive: result.passive, total: result.totalMax }
        setLast(row)
        s.setParams((p) => ({ plot: [...p.plot, { ...row }] }))
      }
    )
  }

  const columns = forceColumns(t)
  const sortedPlot = [...plot].sort((a, b) => a.length - b.length)
  const scopes = (light = false): ReactNode => (
    <div className="grid grid-cols-2 gap-3">
      <Oscilloscope
        xMax={T_MAX}
        yMax={Y_MAX}
        xTicks={[0, 25, 50, 75, 100, 125, 150]}
        yTicks={[0, 1, 2, 3]}
        xLabel={t('fields.time')}
        yLabel={t('fields.force')}
        series={s.traces}
        markerY={passive}
        markerTitle={t('hints.passiveArrow')}
        light={light}
        width={420}
        height={330}
      />
      <Oscilloscope
        xMin={L_MIN}
        xMax={L_MAX}
        yMax={Y_MAX}
        xTicks={[50, 60, 70, 80, 90, 100]}
        yTicks={[0, 1, 2, 3]}
        xLabel={t('lengthTension')}
        yLabel={t('fields.force')}
        legend={[
          { label: t('legend.active'), color: COLORS.active },
          { label: t('legend.passive'), color: COLORS.passive },
          { label: t('legend.total'), color: COLORS.total }
        ]}
        series={(['active', 'passive', 'total'] as const).map((k) => ({
          id: k,
          color: COLORS[k],
          mode: 'dots' as const,
          points: sortedPlot.map((p) => ({ x: p.length, y: p[k] }))
        }))}
        light={light}
        width={420}
        height={330}
      />
    </div>
  )

  return (
    <>
      <ExperimentLayout
        tools={
          <ExperimentTools
            lab={t('title')}
            experiment={t('experiments.isometric')}
            columns={columns}
            rows={s.rows}
            plotDefaults={{ x: 'length', y: 'total' }}
            printableGraph={scopes(true)}
          />
        }
        apparatus={<Apparatus length={length} stimulusId={stimulusId} />}
        apparatusControls={
          <Stepper
            label={t('fields.muscleLength')}
            display={String(length)}
            edit={{ value: length, min: L_MIN, max: L_MAX, step: 1, onChange: (v) => s.setParams({ length: v }) }}
            disabled={running}
            canDecrement={length > L_MIN}
            canIncrement={length < L_MAX}
            onStep={(d) => s.setParams((p) => ({ length: Math.min(L_MAX, Math.max(L_MIN, p.length + d)) }))}
          />
        }
        scope={scopes()}
        scopeActions={
          <>
            <ClearButton onClick={s.clearTraces} disabled={running || s.traces.length === 0}>
              {tc('common.clearTracings')}
            </ClearButton>
            <ClearButton onClick={() => s.setParams({ plot: [] })} disabled={running || plot.length === 0}>
              {tc('common.clearPlot')}
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
                edit={{ value: voltage, min: 0, max: V_DISPLAY_MAX, step: 0.1, onChange: (v) => s.setParams({ voltage: v }) }}
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
              active={last ? fixed(last.active) : ''}
              total={last ? fixed(last.total) : ''}
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
            canRecord={!running && last !== null && last !== recorded}
          />
        }
      />
    </>
  )
}
