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
import { RADIUS, VolumesRun, type VolumeResults } from '../model/respiratory'
import { useVolumesStore, type VolumesRow } from '../store'

const num = (v: number | null): string => (v === null ? '----' : String(v))

export function volumesColumns(t: TFunction): DataColumn<VolumesRow>[] {
  const col = (key: keyof VolumesRow, header: string): DataColumn<VolumesRow> => ({
    key,
    header: t(`columns.${header}`),
    value: (r) => (r[key] as number | null) ?? NaN,
    format: (r) => (key === 'radius' ? fixed(r.radius, 2) : num(r[key] as number | null))
  })
  return [
    col('radius', 'radius'),
    col('flow', 'flow'),
    col('tidal', 'tv'),
    col('expReserve', 'erv'),
    col('inspReserve', 'irv'),
    col('residual', 'rv'),
    col('vitalCapacity', 'vc'),
    col('fev1', 'fev1'),
    col('totalLungCapacity', 'tlc'),
    col('pumpRate', 'pumpRate')
  ]
}

/** Experimento 1: volumen corriente, reservas, capacidad vital, VEF₁ */
export function Volumes(): ReactNode {
  const { t } = useTranslation('respiratory')
  const tc = useTranslation().t
  const s = useVolumesStore()
  const { radius } = s.params
  const run = useRef<VolumesRun | null>(null)
  const traceId = useRef(0)
  const [running, setRunning] = useState(false)
  const [last, setLast] = useState<VolumesRow | null>(null)
  const [recorded, setRecorded] = useState<VolumesRow | null>(null)
  const [, setTick] = useState(0)

  const finishRun = (r: VolumesRun): void => {
    setRunning(false)
    setLast({ radius: r.radius, flow: r.totalFlow, ...r.results } as VolumesRow)
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
    run.current = new VolumesRun(radius)
    traceId.current = s.addTrace()
    setLast(null)
    setRunning(true)
  }

  const r = run.current
  const res: VolumeResults | null = r ? r.results : null
  const columns = volumesColumns(t)
  const scope = (light = false): ReactNode => <LungScope series={s.traces} light={light} />

  return (
    <>
      <ToolbarPortal>
        <ExperimentTools
          lab={t('title')}
          experiment={t('experiments.rv')}
          columns={columns}
          rows={s.rows}
          printableGraph={scope(true)}
        />
      </ToolbarPortal>
      <RespLayout
        apparatus={<BellJar scale={running && r ? r.lungScale : 100} radius={radius} />}
        controls={
          <div className="flex flex-wrap items-end justify-around gap-3">
            <div className="flex flex-col items-center gap-1">
              <span className="text-sm font-semibold text-bench-100">{t('fields.flow')}</span>
              <Readout value={running && r ? fixed(r.flow, 2) : '----'} />
            </div>
            <Stepper
              label={t('fields.radius')}
              display={fixed(radius, 2)}
              disabled={running}
              edit={{ ...RADIUS, value: radius, onChange: (v) => s.setParams({ radius: v }) }}
            />
            <div className="flex items-center gap-2">
              <Light on={running} />
              <Button variant="primary" onClick={start}>
                {running ? t('actions.stop') : t('actions.start')}
              </Button>
            </div>
            <div className="flex gap-2" title={t('hints.forced')}>
              <Button onClick={() => r?.requestERV()} disabled={!running || !r?.canForce}>
                {t('actions.erv')}
              </Button>
              <Button onClick={() => r?.requestFVC()} disabled={!running || !r?.canForce}>
                {t('actions.fvc')}
              </Button>
            </div>
          </div>
        }
        scope={scope()}
        scopeActions={
          <Button className="border border-gray-500 bg-gray-100" onClick={s.clearTraces} disabled={running || s.traces.length === 0}>
            {tc('common.clearTracings')}
          </Button>
        }
        results={
          <div className="grid grid-cols-2 gap-2">
            <ResultCell label={t('fields.tidal')} value={num(res?.tidal ?? null)} />
            <ResultCell label={t('fields.vitalCapacity')} value={num(res?.vitalCapacity ?? null)} />
            <ResultCell label={t('fields.expReserve')} value={num(res?.expReserve ?? null)} />
            <ResultCell label={t('fields.fev1')} value={num(res?.fev1 ?? null)} />
            <ResultCell label={t('fields.inspReserve')} value={num(res?.inspReserve ?? null)} />
            <ResultCell label={t('fields.totalLungCapacity')} value={num(res?.totalLungCapacity ?? null)} />
            <ResultCell label={t('fields.residual')} value={num(res?.residual ?? null)} />
            <ResultCell label={t('fields.pumpRate')} value={num(res?.pumpRate ?? 15)} />
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
