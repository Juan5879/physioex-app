import { useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { DataTable, type DataColumn } from '@/shared/components/DataTable'
import { ExperimentTools } from '@/shared/components/ExperimentTools'
import { BellJar, ResultCell } from '@/shared/components/Lungs'
import { ToolbarPortal } from '@/shared/components/ToolbarSlot'
import { Button, Light, Panel, Readout } from '@/shared/components/ui'
import { fixed } from '@/shared/lib/format'
import { useFrameLoop } from '@/shared/lib/useFrameLoop'
import { AbScope } from '../components/Scope'
import { RespiratoryRun } from '../model/acidBase'
import { useRespStore, type RespRow } from '../store'

export function respColumns(t: TFunction): DataColumn<RespRow>[] {
  return [
    { key: 'condition', header: t('columns.condition'), value: () => NaN, format: (r) => t(`conditions.${r.condition}`) },
    { key: 'minPco2', header: t('columns.minPco2'), value: (r) => r.minPco2, format: (r) => fixed(r.minPco2) },
    { key: 'maxPco2', header: t('columns.maxPco2'), value: (r) => r.maxPco2, format: (r) => fixed(r.maxPco2) },
    { key: 'minPh', header: t('columns.minPh'), value: (r) => r.minPh, format: (r) => fixed(r.minPh) },
    { key: 'maxPh', header: t('columns.maxPh'), value: (r) => r.maxPh, format: (r) => fixed(r.maxPh) }
  ]
}

/** Experimento 1: hiperventilación y reinhalación cambian la PCO₂ y el pH */
export function RespiratoryAB(): ReactNode {
  const { t } = useTranslation('acidBase')
  const tc = useTranslation().t
  const s = useRespStore()
  const run = useRef<RespiratoryRun | null>(null)
  const traceId = useRef(0)
  const [running, setRunning] = useState(false)
  const [last, setLast] = useState<RespRow | null>(null)
  const [recorded, setRecorded] = useState<RespRow | null>(null)
  const [, setTick] = useState(0)

  const finishRun = (r: RespiratoryRun): void => {
    setRunning(false)
    setLast({ condition: r.condition, minPco2: r.minPco2, maxPco2: r.maxPco2, minPh: r.minPh, maxPh: r.maxPh })
  }

  useFrameLoop(running, () => {
    const r = run.current
    if (!r) return
    r.stepFrame()
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
    run.current = new RespiratoryRun()
    traceId.current = s.addTrace()
    setLast(null)
    setRunning(true)
  }

  const r = run.current
  const columns = respColumns(t)
  const scope = (light = false): ReactNode => <AbScope series={s.traces} light={light} />

  return (
    <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-3 p-3">
      <ToolbarPortal>
        <ExperimentTools lab={t('title')} experiment={t('experiments.raa')} columns={columns} rows={s.rows} printableGraph={scope(true)} />
      </ToolbarPortal>
      <div className="flex flex-col gap-3">
        <div className="rounded-xl bg-gradient-to-b from-bench-50/15 to-bench-50/5 p-2">
          <BellJar scale={running && r ? 200 - r.lungSize : 100} radius={5} bag={running && r?.bagInflated} />
        </div>
        <Panel className="flex flex-wrap items-center justify-around gap-3">
          <div className="flex items-center gap-2">
            <Light on={running} />
            <Button variant="primary" onClick={start}>
              {running ? t('actions.stop') : t('actions.start')}
            </Button>
          </div>
          <Readout value={r ? t(`conditions.${r.display}`) : t('conditions.normal')} className="min-w-52 text-center" />
        </Panel>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col rounded-2xl border-4 border-gray-400 bg-gray-300 p-2 shadow-xl">
          {scope()}
          <div className="mt-2 flex justify-end">
            <Button className="border border-gray-500 bg-gray-100" onClick={s.clearTraces} disabled={running || s.traces.length === 0}>
              {tc('common.clearTracings')}
            </Button>
          </div>
        </div>
        <Panel className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
          <div className="flex flex-col gap-2">
            <Button onClick={() => r?.hyperventilate()} disabled={!running || r?.abnormal}>
              {t('actions.hyperventilation')}
            </Button>
            <Button onClick={() => r?.rebreathe()} disabled={!running || r?.abnormal}>
              {t('actions.rebreathing')}
            </Button>
            <Button onClick={() => r?.normalBreathing()} disabled={!running || !r?.abnormal}>
              {t('actions.normal')}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ResultCell label={t('fields.ph')} value={r ? fixed(r.ph) : '---'} />
            <ResultCell label={t('fields.pco2')} value={r ? fixed(r.pco2) : '----'} />
            <ResultCell label={t('fields.maxPco2')} value={r ? fixed(r.maxPco2) : '----'} />
            <ResultCell label={t('fields.minPco2')} value={r ? fixed(r.minPco2) : '----'} />
          </div>
        </Panel>
      </div>
      <Panel className="col-span-2">
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
      </Panel>
    </div>
  )
}
