import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { DataTable } from '@/shared/components/DataTable'
import { ExperimentTools } from '@/shared/components/ExperimentTools'
import { Oscilloscope, ticks } from '@/shared/components/Oscilloscope'
import { Stepper } from '@/shared/components/Stepper'
import { Button, Light, Modal, Readout } from '@/shared/components/ui'
import { fixed, roundTo } from '@/shared/lib/format'
import { useSweep } from '@/shared/lib/useSweep'
import { Apparatus, WeightTray } from '../components/Apparatus'
import { isotonicColumns } from '../components/columns'
import { ClearButton, ExperimentLayout, ForceReadouts, TimeScaleSelect } from '../components/ExperimentLayout'
import { passiveForce } from '../model/common'
import { V_DISPLAY_MAX } from '../model/constants'
import { IT, isotonicLength, simulateIsotonic, type IsotonicPoint } from '../model/isotonic'
import { useIsotonicStore, type IsotonicRow } from '../store'

const Y_MAX = 3

/** Experimento 4: contracción isotónica (carga, velocidad de acortamiento) */
export function Isotonic(): ReactNode {
  const { t } = useTranslation('muscle')
  const tc = useTranslation().t
  const s = useIsotonicStore()
  const { voltage, platform, weight, tMax } = s.params
  const sweep = useSweep<IsotonicPoint>()
  const [stimulusId, setStimulusId] = useState(0)
  const [shortening, setShortening] = useState(0)
  const [last, setLast] = useState<IsotonicRow | null>(null)
  // el original desactivaba "Registrar datos" tras registrar un resultado
  const [recorded, setRecorded] = useState<IsotonicRow | null>(null)
  const [needWeight, setNeedWeight] = useState(false)

  const length = isotonicLength(weight, platform)
  const passive = passiveForce(length)
  const running = sweep.running

  const stimulate = (): void => {
    if (weight === 0) {
      setNeedWeight(true)
      return
    }
    setLast(null)
    const r = simulateIsotonic({ voltage, platformHeight: platform, weight, tMax })
    const id = s.addTrace()
    if (voltage > 0) setStimulusId((n) => n + 1)
    // el original calculaba 11 puntos por frame en este experimento
    sweep.start(
      r.points,
      11,
      (visible) => {
        s.updateTrace(id, visible.map((p) => ({ x: p.t, y: p.force })))
        setShortening(visible[visible.length - 1]?.shortening ?? 0)
      },
      () => {
        setShortening(0)
        setLast({
          voltage,
          length: r.length,
          weight,
          velocity: r.velocityMax,
          active: r.activeMax,
          passive: r.passive,
          total: r.totalMax
        })
      }
    )
  }

  const columns = isotonicColumns(t)
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
      light={light}
    />
  )

  const setWeight = (w: number): void => {
    setLast(null)
    s.setParams({ weight: w })
  }

  return (
    <>
      <ExperimentLayout
        tools={
          <ExperimentTools
            lab={t('title')}
            experiment={t('experiments.isotonic')}
            columns={columns}
            rows={s.rows}
            plotDefaults={{ x: 'weight', y: 'velocity' }}
            printableGraph={scope(true)}
          />
        }
        apparatus={
          <Apparatus
            length={weight > 0 ? length : 50}
            shortening={shortening}
            stimulusId={stimulusId}
            isotonic={{
              weight,
              platform,
              locked: running,
              onDropWeight: setWeight,
              onRemoveWeight: () => setWeight(0)
            }}
          />
        }
        apparatusControls={
          <div className="flex flex-col items-center gap-3">
            <WeightTray weights={IT.weights} current={weight} onPick={setWeight} locked={running} />
            <Stepper
              label={t('fields.platformHeight')}
              display={String(platform)}
              edit={{
                value: platform,
                min: IT.P_MIN,
                max: IT.P_MAX,
                step: 1,
                onChange: (v) => {
                  setLast(null)
                  s.setParams({ platform: v })
                }
              }}
              disabled={running}
              canDecrement={platform > IT.P_MIN}
              canIncrement={platform < IT.P_MAX}
              onStep={(d) => {
                setLast(null)
                s.setParams((p) => ({ platform: Math.min(IT.P_MAX, Math.max(IT.P_MIN, p.platform + d)) }))
              }}
            />
          </div>
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
                <Light on={running} />
                <Button variant="primary" onClick={stimulate} disabled={running}>
                  {tc('common.stimulate')}
                </Button>
              </div>
              <Stepper
                label={t('fields.voltage')}
                display={fixed(voltage, 1)}
                edit={{
                  value: voltage,
                  min: 0,
                  max: V_DISPLAY_MAX,
                  step: 0.1,
                  onChange: (v) => {
                    setLast(null)
                    s.setParams({ voltage: v })
                  }
                }}
                disabled={running}
                canDecrement={voltage > 0}
                canIncrement={voltage < V_DISPLAY_MAX}
                onStep={(d) => {
                  setLast(null)
                  s.setParams((p) => ({ voltage: Math.min(V_DISPLAY_MAX, Math.max(0, roundTo(p.voltage + d * 0.1, 1))) }))
                }}
              />
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm font-semibold text-bench-100">{t('fields.muscleLength')}</span>
              <Readout value={fixed(weight > 0 ? length : 50, 1)} />
              <span className="text-sm font-semibold text-bench-100">{t('fields.velocity')}</span>
              <Readout value={last ? fixed(last.velocity) : ''} />
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
      {needWeight && (
        <Modal title={t('experiments.isotonic')} onClose={() => setNeedWeight(false)}>
          <p className="mb-5">{t('hints.putWeight')}</p>
          <div className="flex justify-end">
            <Button variant="primary" onClick={() => setNeedWeight(false)}>
              {tc('common.ok')}
            </Button>
          </div>
        </Modal>
      )}
    </>
  )
}
