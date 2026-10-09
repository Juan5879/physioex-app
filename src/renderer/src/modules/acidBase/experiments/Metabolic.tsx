import { useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { DataTable, type DataColumn } from '@/shared/components/DataTable'
import { ExperimentTools } from '@/shared/components/ExperimentTools'
import { BellJar, ResultCell } from '@/shared/components/Lungs'
import { Stepper } from '@/shared/components/Stepper'
import { ToolbarPortal } from '@/shared/components/ToolbarSlot'
import { Button, Light, Panel } from '@/shared/components/ui'
import { fixed } from '@/shared/lib/format'
import { useFrameLoop } from '@/shared/lib/useFrameLoop'
import { AbScope } from '../components/Scope'
import { METABOLIC, MetabolicRun, type MetabolicResult } from '../model/acidBase'
import { useMetabolicStore } from '../store'

export function metabolicColumns(t: TFunction): DataColumn<MetabolicResult>[] {
  return [
    { key: 'rate', header: t('columns.metabolicRate'), value: (r) => r.rate, format: (r) => String(r.rate) },
    { key: 'bpm', header: t('columns.bpm'), value: (r) => r.bpm, format: (r) => String(r.bpm) },
    { key: 'ph', header: t('columns.bloodPh'), value: (r) => r.ph, format: (r) => fixed(r.ph) },
    { key: 'pco2', header: t('columns.pco2'), value: (r) => r.pco2, format: (r) => String(r.pco2) },
    { key: 'h', header: t('columns.h'), value: (r) => r.h, format: (r) => String(r.h) },
    { key: 'hco3', header: t('columns.hco3'), value: (r) => r.hco3, format: (r) => String(r.hco3) }
  ]
}

/** Experimento 2: la tasa metabólica cambia la producción de CO₂ y la respiración compensa */
export function Metabolic(): ReactNode {
  const { t } = useTranslation('acidBase')
  const tc = useTranslation().t
  const s = useMetabolicStore()
  const { index } = s.params
  const run = useRef<MetabolicRun | null>(null)
  const traceId = useRef(0)
  const [running, setRunning] = useState(false)
  const [last, setLast] = useState<MetabolicResult | null>(null)
  const [recorded, setRecorded] = useState<MetabolicResult | null>(null)
  const [, setTick] = useState(0)

  const finishRun = (r: MetabolicRun): void => {
    setRunning(false)
    setLast(r.result())
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
    run.current = new MetabolicRun(index)
    traceId.current = s.addTrace()
    setLast(null)
    setRunning(true)
  }

  const r = run.current
  const columns = metabolicColumns(t)
  const scope = (light = false): ReactNode => <AbScope series={s.traces} light={light} />
  const show = (v: number | undefined, dec = false): string => (v === undefined ? '----' : dec ? fixed(v) : String(v))

  return (
    <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-3 p-3">
      <ToolbarPortal>
        <ExperimentTools lab={t('title')} experiment={t('experiments.maa')} columns={columns} rows={s.rows} printableGraph={scope(true)} />
      </ToolbarPortal>
      <div className="flex flex-col gap-3">
        <Panel className="flex justify-center">
          <Stepper
            label={t('fields.metabolicRate')}
            display={String(METABOLIC.rate[index])}
            disabled={running}
            edit={{
              min: METABOLIC.rate[0],
              max: METABOLIC.rate[METABOLIC.rate.length - 1],
              step: 5,
              value: METABOLIC.rate[index],
              onChange: (v) => {
                s.setParams({ index: METABOLIC.rate.indexOf(v) })
                setLast(null)
              }
            }}
          />
        </Panel>
        <div className="rounded-xl bg-gradient-to-b from-bench-50/15 to-bench-50/5 p-2">
          <BellJar scale={running && r ? 200 - r.lungSize : 100} radius={5} />
        </div>
        <Panel className="flex items-center justify-center gap-2">
          <Light on={running} />
          <Button variant="primary" onClick={start}>
            {running ? t('actions.stop') : t('actions.start')}
          </Button>
          <span className={`ml-4 text-2xl ${running && r && r.beat % 2 === 1 ? 'scale-110' : ''}`}>🫀</span>
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
        <Panel className="grid grid-cols-3 gap-2">
          <ResultCell label={t('fields.bpm')} value={show(last?.bpm)} />
          <ResultCell label={t('fields.pco2')} value={show(last?.pco2)} />
          <ResultCell label={t('fields.hco3')} value={show(last?.hco3)} />
          <ResultCell label={t('fields.bloodPh')} value={show(last?.ph, true)} />
          <ResultCell label={t('fields.h')} value={show(last?.h)} />
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
