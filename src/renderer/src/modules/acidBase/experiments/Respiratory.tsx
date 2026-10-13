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
    <>
    <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] items-start gap-4">
      <ToolbarPortal>
        <ExperimentTools lab={t('title')} experiment={t('experiments.raa')} columns={columns} rows={s.rows} printableGraph={scope(true)} />
      </ToolbarPortal>
      <Panel title={t('panels.apparatus')}>
        <div className="px-well p-4">
          <BellJar scale={running && r ? 200 - r.lungSize : 100} radius={5} bag={running && r?.bagInflated} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Light on={running} label={running ? tc('common.inProgress') : tc('common.stopped')} />
          <Button variant="primary" icon={running ? undefined : 'play'} onClick={start}>
            {running ? t('actions.stop') : t('actions.start')}
          </Button>
          <Readout text value={r ? t(`conditions.${r.display}`) : t('conditions.normal')} className="ml-auto min-w-40" />
        </div>
      </Panel>
      <Panel title={tc('common.recording')}>
        <div>
          {scope()}
          <div className="px-chart__bar">
            <span>{t('fields.condition')}</span>
            <div className="px-seg" role="group" aria-label={t('fields.condition')}>
              <button
                type="button"
                aria-pressed={running && r?.display === 'hyperventilation'}
                onClick={() => r?.hyperventilate()}
                disabled={!running || r?.abnormal}
              >
                {t('actions.hyperventilation')}
              </button>
              <button
                type="button"
                aria-pressed={running && r?.display === 'rebreathing'}
                onClick={() => r?.rebreathe()}
                disabled={!running || r?.abnormal}
              >
                {t('actions.rebreathing')}
              </button>
              <button
                type="button"
                aria-pressed={running && (r?.display === 'normal' || r?.display === 'returning')}
                onClick={() => r?.normalBreathing()}
                disabled={!running || !r?.abnormal}
              >
                {t('actions.normal')}
              </button>
            </div>
            <span className="flex-1" />
            <Button size="sm" icon="eraser" onClick={s.clearTraces} disabled={running || s.traces.length === 0}>
              {tc('common.clearTracings')}
            </Button>
          </div>
        </div>
        <div className="px-section">
          <div className="px-metrics">
            <ResultCell label={t('fields.ph')} value={r ? fixed(r.ph) : '---'} />
            <ResultCell label={t('fields.pco2')} value={r ? fixed(r.pco2) : '----'} />
            <ResultCell label={t('fields.maxPco2')} value={r ? fixed(r.maxPco2) : '----'} />
            <ResultCell label={t('fields.minPco2')} value={r ? fixed(r.minPco2) : '----'} />
          </div>
        </div>
      </Panel>
    </div>
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
    </>
  )
}
