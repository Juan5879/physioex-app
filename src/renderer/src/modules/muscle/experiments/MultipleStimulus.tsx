import { useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { DataTable } from '@/shared/components/DataTable'
import { ExperimentTools } from '@/shared/components/ExperimentTools'
import { Oscilloscope, ticks, type ScopePoint } from '@/shared/components/Oscilloscope'
import { Stepper } from '@/shared/components/Stepper'
import { Button, Light } from '@/shared/components/ui'
import { fixed, roundTo } from '@/shared/lib/format'
import { useFrameLoop } from '@/shared/lib/useFrameLoop'
import { Apparatus } from '../components/Apparatus'
import { multipleColumns } from '../components/columns'
import { ClearButton, ExperimentLayout, ForceReadouts, TimeScaleSelect } from '../components/ExperimentLayout'
import { passiveForce } from '../model/common'
import { L_MAX, L_MIN, V_DISPLAY_MAX } from '../model/constants'
import { MS, MultipleStimulusSim, type MsMode } from '../model/multipleStimulus'
import { useMultipleStore, type MultipleRow } from '../store'

const Y_MAX = 6

/** Experimento 2: estímulos múltiples (sumación de ondas, tétanos, fatiga) */
export function MultipleStimulus(): ReactNode {
  const { t } = useTranslation('muscle')
  const tc = useTranslation().t
  const s = useMultipleStore()
  const { voltage, length, tMax, rate } = s.params

  const sim = useRef<MultipleStimulusSim | null>(null)
  const trace = useRef<{ id: number; points: Array<ScopePoint | null>; lastX: number }>({
    id: 0,
    points: [],
    lastX: 0
  })
  const [mode, setMode] = useState<MsMode>('idle')
  const [stimulusId, setStimulusId] = useState(0)
  const [last, setLast] = useState<MultipleRow | null>(null)
  // el original desactivaba "Registrar datos" tras registrar un resultado
  const [recorded, setRecorded] = useState<MultipleRow | null>(null)

  const passive = passiveForce(length)
  const running = mode !== 'idle'

  /** Crea un simulador nuevo si no hay uno en curso (equivale a f_now == 0) */
  const ensureSim = (): MultipleStimulusSim => {
    if (sim.current && sim.current.mode !== 'idle') return sim.current
    sim.current = new MultipleStimulusSim({ voltage, length, tMax })
    trace.current = { id: s.addTrace(), points: [], lastX: 0 }
    setLast(null)
    return sim.current
  }

  const spark = (): void => {
    if (voltage > 0) setStimulusId((n) => n + 1)
  }

  const singleStimulus = (): void => {
    const m = ensureSim()
    m.singleStimulus()
    spark()
    setMode(m.mode)
  }

  const toggleTrain = (): void => {
    const m = mode === 'train' && sim.current ? sim.current : ensureSim()
    m.toggleTrain(rate)
    if (m.stimOn) spark()
    setMode(m.mode)
  }

  useFrameLoop(running, () => {
    const m = sim.current
    if (!m) return
    const tr = trace.current
    let stimulated = false
    const steps = m.stepsPerFrame
    for (let i = 0; i < steps && m.mode !== 'idle'; i++) {
      const r = m.step()
      stimulated ||= r.stimulated
      if (r.x === null) continue
      // el barrido da la vuelta: cortar la línea
      if (r.x < tr.lastX) tr.points.push(null)
      tr.points.push({ x: r.x, y: r.force })
      tr.lastX = r.x
    }
    s.updateTrace(tr.id, [...tr.points])
    if (stimulated) spark()
    if (m.mode === 'idle') {
      setLast({ voltage, length, rate, active: m.activeMax, passive: m.passive, total: m.totalMax })
      setMode('idle')
    }
  })

  const columns = multipleColumns(t)
  const scope = (light = false): ReactNode => (
    <Oscilloscope
      xMax={tMax}
      yMax={Y_MAX}
      xTicks={ticks(0, tMax, 10).map((v) => Math.round(v))}
      yTicks={[0, 1, 2, 3, 4, 5, 6]}
      xLabel={t('fields.time')}
      yLabel={t('fields.force')}
      series={s.traces}
      markerY={passive}
      markerTitle={t('hints.passiveArrow')}
      light={light}
    />
  )

  return (
    <>
      <ExperimentLayout
        tools={
          <ExperimentTools
            lab={t('title')}
            experiment={t('experiments.multiple')}
            columns={columns}
            rows={s.rows}
            plotDefaults={{ x: 'rate', y: 'active' }}
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
            <ClearButton onClick={s.clearTraces} disabled={running || s.traces.length === 0}>
              {tc('common.clearTracings')}
            </ClearButton>
          </>
        }
        stimulator={
          <div className="flex flex-wrap items-start justify-around gap-4">
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2">
                <Light on={mode === 'single'} />
                <Button variant="primary" onClick={singleStimulus} disabled={mode === 'train'}>
                  {t('actions.singleStimulus')}
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
              active={running ? '----' : last ? fixed(last.active) : ''}
              total={running ? '----' : last ? fixed(last.total) : ''}
            />
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2">
                <Light on={mode === 'train'} />
                <Button
                  variant={mode === 'train' ? 'danger' : 'primary'}
                  onClick={toggleTrain}
                  disabled={mode === 'single'}
                >
                  {mode === 'train' ? t('actions.stopStimulus') : t('actions.multipleStimulus')}
                </Button>
              </div>
              <Stepper
                label={t('fields.stimRate')}
                display={String(rate)}
                disabled={running}
                canDecrement={rate > MS.rateMin}
                canIncrement={rate < MS.rateMax}
                onStep={(d) => s.setParams((p) => ({ rate: Math.min(MS.rateMax, Math.max(MS.rateMin, p.rate + d)) }))}
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
