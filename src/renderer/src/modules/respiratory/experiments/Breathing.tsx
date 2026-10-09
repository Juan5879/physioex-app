import { useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { DataTable, type DataColumn } from '@/shared/components/DataTable'
import { ExperimentTools } from '@/shared/components/ExperimentTools'
import { Stepper } from '@/shared/components/Stepper'
import { ToolbarPortal } from '@/shared/components/ToolbarSlot'
import { Button, Light, Readout } from '@/shared/components/ui'
import { fixed } from '@/shared/lib/format'
import { useFrameLoop } from '@/shared/lib/useFrameLoop'
import { BellJar, LungScope, RespLayout, ResultCell } from '../components/Bench'
import { BreathingRun, RADIUS } from '../model/respiratory'
import { useBreathingStore, type BreathingRow } from '../store'

export function breathingColumns(t: TFunction): DataColumn<BreathingRow>[] {
  return [
    { key: 'condition', header: t('columns.condition'), value: () => NaN, format: (r) => t(`conditions.${r.condition}`) },
    { key: 'pco2', header: t('columns.pco2'), value: (r) => r.pco2, format: (r) => fixed(r.pco2) },
    { key: 'maxPco2', header: t('columns.maxPco2'), value: (r) => r.maxPco2, format: (r) => fixed(r.maxPco2) },
    { key: 'minPco2', header: t('columns.minPco2'), value: (r) => r.minPco2, format: (r) => fixed(r.minPco2) },
    { key: 'pumpRate', header: t('columns.pumpRate'), value: (r) => r.pumpRate, format: (r) => fixed(r.pumpRate) },
    { key: 'radius', header: t('columns.radius'), value: (r) => r.radius, format: (r) => fixed(r.radius, 1) },
    { key: 'totalFlow', header: t('columns.totalFlow'), value: (r) => r.totalFlow, format: (r) => fixed(r.totalFlow) }
  ]
}

/** Experimento 3: respiración rápida, reinhalación y apnea, con su efecto sobre la PCO₂ */
export function Breathing(): ReactNode {
  const { t } = useTranslation('respiratory')
  const tc = useTranslation().t
  const s = useBreathingStore()
  const { radius } = s.params
  const run = useRef<BreathingRun | null>(null)
  const traceId = useRef(0)
  const [running, setRunning] = useState(false)
  const [last, setLast] = useState<BreathingRow | null>(null)
  const [recorded, setRecorded] = useState<BreathingRow | null>(null)
  const [, setTick] = useState(0)

  const finishRun = (r: BreathingRun): void => {
    setRunning(false)
    if (r.results) setLast({ ...r.results, radius: r.radius })
  }

  useFrameLoop(running, () => {
    const r = run.current
    if (!r) return
    r.step()
    s.updateTrace(traceId.current, [...r.points])
    if (r.done) finishRun(r)
    setTick((n) => n + 1)
  })

  const start = (): void => {
    if (running && run.current) {
      run.current.finish()
      finishRun(run.current)
      return
    }
    run.current = new BreathingRun(radius)
    traceId.current = s.addTrace()
    setLast(null)
    setRunning(true)
  }

  const r = run.current
  const unusual = r !== null && r.current !== 'normal' && r.current !== 'resumeNormal'
  const columns = breathingColumns(t)
  const scope = (light = false): ReactNode => <LungScope series={s.traces} light={light} />
  const res = last
  const condition = running && r ? t(`conditions.${r.displayCondition}`) : res ? t(`conditions.${res.condition}`) : t('conditions.normal')

  return (
    <>
      <ToolbarPortal>
        <ExperimentTools
          lab={t('title')}
          experiment={t('experiments.vb')}
          columns={columns}
          rows={s.rows}
          printableGraph={scope(true)}
        />
      </ToolbarPortal>
      <RespLayout
        apparatus={<BellJar scale={running && r ? r.lungScale : 100} radius={radius} bag={running && r?.bagOn} />}
        controls={
          <div className="flex flex-wrap items-end justify-around gap-3">
            <Stepper
              label={t('fields.radius')}
              display={fixed(radius, 1)}
              disabled={running}
              edit={{ ...RADIUS, value: radius, onChange: (v) => s.setParams({ radius: v }) }}
            />
            <div className="flex items-center gap-2">
              <Light on={running} />
              <Button variant="primary" onClick={start}>
                {running ? t('actions.stop') : t('actions.start')}
              </Button>
            </div>
            <Readout value={condition} className="min-w-48 text-center" />
          </div>
        }
        scope={scope()}
        scopeActions={
          <Button className="border border-gray-500 bg-gray-100" onClick={s.clearTraces} disabled={running || s.traces.length === 0}>
            {tc('common.clearTracings')}
          </Button>
        }
        results={
          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
            <div className="flex flex-col gap-2">
              <Button onClick={() => r?.rapid()} disabled={!running || unusual}>
                {t('actions.rapid')}
              </Button>
              <Button onClick={() => r?.rebreathe()} disabled={!running || unusual}>
                {t('actions.rebreathing')}
              </Button>
              <Button onClick={() => r?.holdBreath()} disabled={!running || unusual}>
                {t('actions.holding')}
              </Button>
              <Button onClick={() => r?.normalBreathing()} disabled={!running || !unusual}>
                {t('actions.normal')}
              </Button>
            </div>
            <div className="flex flex-col gap-2">
              <ResultCell label={t('fields.pco2')} value={running && r ? fixed(r.pco2) : res ? fixed(res.pco2) : '----'} />
              <ResultCell label={t('fields.maxPco2')} value={running && r ? fixed(r.maxPco2) : res ? fixed(res.maxPco2) : '----'} />
              <ResultCell label={t('fields.minPco2')} value={running && r ? fixed(r.minPco2) : res ? fixed(res.minPco2) : '----'} />
              <ResultCell label={t('fields.pumpRate')} value={res && !running ? fixed(res.pumpRate) : '----'} />
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
