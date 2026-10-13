import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { DataTable, type DataColumn } from '@/shared/components/DataTable'
import { ExperimentTools } from '@/shared/components/ExperimentTools'
import { ToolbarPortal } from '@/shared/components/ToolbarSlot'
import { Button } from '@/shared/components/ui'
import { BloodLayout, SampleBar, TimerReadout, useLabTimer } from '../components/Common'
import { ESR, ESR_MINUTES, esrDistance } from '../model/blood'
import { useEsrStore, type EsrRow } from '../store'

export function esrColumns(t: TFunction): DataColumn<EsrRow>[] {
  return [
    { key: 'sample', header: t('columns.sample'), value: (r) => r.sample, format: (r) => String(r.sample) },
    { key: 'distance', header: t('columns.distance'), value: (r) => r.distance, format: (r) => t('values.mm', { v: r.distance }) },
    { key: 'time', header: t('columns.time'), value: (r) => r.minutes, format: (r) => t('values.min', { v: r.minutes }) },
    // el original mostraba la distancia de 60 min como mm/h
    { key: 'rate', header: t('columns.rate'), value: (r) => r.distance, format: (r) => t('values.mmhr', { v: r.distance }) }
  ]
}

/** Actividad 2: velocidad de sedimentación globular en tubos de 60 min */
export function Sedimentation(): ReactNode {
  const { t } = useTranslation('blood')
  const s = useEsrStore()
  const [rack, setRack] = useState<number[]>([])
  const [done, setDone] = useState(false)
  const [measured, setMeasured] = useState<number | null>(null)
  const clock = useLabTimer(() => setDone(true))
  const recorded = s.rows.map((r) => r.sample - 1)
  const columns = esrColumns(t)
  const minutes = done ? ESR_MINUTES : clock.elapsed

  return (
    <BloodLayout
      rightTitle={t('panels.sedimentation')}
      running={clock.running}
      left={
        <>
          <ToolbarPortal>
            <ExperimentTools lab={t('title')} experiment={t('experiments.esr')} columns={columns} rows={s.rows} />
          </ToolbarPortal>
          <SampleBar
            count={ESR.length}
            selected={null}
            used={rack}
            disabled={clock.running || done}
            label={t('actions.prepare')}
            onSelect={(i) => setRack((r) => [...r, i])}
          />
          <div className="px-well flex items-end justify-center gap-4 p-4">
            {rack.map((i) => {
              const d = esrDistance(i, minutes)
              return (
                <button
                  key={i}
                  type="button"
                  disabled={!done}
                  onClick={() => setMeasured(i)}
                  aria-pressed={measured === i}
                  className="px-option !gap-1 !p-1.5 disabled:cursor-not-allowed"
                >
                  <svg viewBox="0 0 24 120" className="h-40 w-7">
                    <rect x={4} y={4} width={16} height={110} rx={4} className="il-glass" strokeWidth={1.5} />
                    <rect x={5} y={10} width={14} height={d * 2} style={{ fill: 'var(--signal)' }} fillOpacity={0.45} />
                    <rect x={5} y={10 + d * 2} width={14} height={100 - d * 2} style={{ fill: 'var(--chart-4)' }} />
                  </svg>
                  <span className="font-mono text-xs">{i + 1}</span>
                </button>
              )
            })}
          </div>
          {measured !== null && done && (
            <div className="px-chip !h-auto !justify-start !rounded-[var(--radius-md)] !py-1.5 !font-sans">
              {t('fields.sample')} {measured + 1}: {t('values.mm', { v: esrDistance(measured, ESR_MINUTES) })}
            </div>
          )}
        </>
      }
      right={
        <>
          <span className="px-label">
            {t('fields.timer')}: {ESR_MINUTES}
          </span>
          <Button variant="primary" onClick={() => clock.start(ESR_MINUTES)} disabled={clock.running || done || rack.length === 0}>
            {t('actions.start')}
          </Button>
          <TimerReadout running={clock.running} elapsed={minutes} />
          <Button
            onClick={() => {
              setRack([])
              setDone(false)
              setMeasured(null)
              clock.reset()
            }}
            disabled={clock.running}
          >
            {t('actions.reset')}
          </Button>
        </>
      }
      table={
        <DataTable
          columns={columns}
          rows={s.rows}
          selected={s.selected}
          onSelect={s.select}
          onRecord={() => measured !== null && s.addRow({ sample: measured + 1, distance: esrDistance(measured, ESR_MINUTES), minutes: ESR_MINUTES })}
          onDelete={s.deleteRow}
          onClear={s.clearRows}
          canRecord={done && measured !== null && !recorded.includes(measured)}
        />
      }
    />
  )
}
