import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { DataTable, type DataColumn } from '@/shared/components/DataTable'
import { ExperimentTools } from '@/shared/components/ExperimentTools'
import { ToolbarPortal } from '@/shared/components/ToolbarSlot'
import { Panel } from '@/shared/components/ui'
import { ProcedureList, useProcedure, type ProcedureStep } from '../components/Procedure'
import { WB_BANDS, WB_MINUTES, WESTERN_BLOT } from '../model/serology'
import { useWbStore, type WbRow } from '../store'

const STEPS: ProcedureStep[] = [
  { key: 'wb1' },
  { key: 'wb2' },
  { key: 'wb3', incubate: WB_MINUTES },
  { key: 'wb4' },
  { key: 'wb5', incubate: WB_MINUTES },
  { key: 'wb6' }
]

export function wbColumns(t: TFunction): DataColumn<WbRow>[] {
  return [
    { key: 'sample', header: t('columns.sample'), value: () => NaN, format: (r) => t(`samples.${r.sample}`) },
    ...WB_BANDS.map((b, i) => ({
      key: b,
      header: b.replace(/(\D+)(\d+)/, '$1 $2'),
      value: () => NaN,
      format: (r: WbRow) => t(r.bands[i] ? 'values.yes' : 'values.no')
    }))
  ]
}

/** Experimento 4: confirmación de VIH por Western blot */
export function WesternBlot(): ReactNode {
  const { t } = useTranslation('serology')
  const s = useWbStore()
  const proc = useProcedure(STEPS)
  const [selected, setSelected] = useState<number | null>(null)
  const recorded = s.rows.map((r) => r.sample)
  const columns = wbColumns(t)
  const developed = proc.finished

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 p-3">
      <ToolbarPortal>
        <ExperimentTools lab={t('title')} experiment={t('experiments.wb')} columns={columns} rows={s.rows} />
      </ToolbarPortal>
      <Panel>
        <ProcedureList steps={STEPS} proc={proc} unit="min" />
      </Panel>
      <Panel className="flex flex-col items-center gap-3">
        <div className="flex items-start gap-4 rounded-xl bg-bench-900 p-4">
          <div className="flex flex-col pt-3 text-right font-mono text-xs text-bench-300" style={{ gap: 20 }}>
            {WB_BANDS.map((b) => (
              <span key={b}>{b}</span>
            ))}
          </div>
          {WESTERN_BLOT.map((w, i) => (
            <button
              key={w.sample}
              type="button"
              disabled={!developed}
              onClick={() => setSelected(i)}
              className={`flex flex-col items-center gap-1 rounded p-1 ${selected === i ? 'ring-2 ring-sky-400' : ''}`}
            >
              <svg viewBox="0 0 20 140" className="h-44 w-6">
                <rect x={2} y={2} width={16} height={136} rx={2} fill="#f8fafc" />
                {developed &&
                  w.bands.map((on, k) => (on ? <rect key={k} x={3} y={14 + k * 25} width={14} height={4} fill="#6b21a8" /> : null))}
              </svg>
              <span className="max-w-16 text-center text-xs leading-tight">{t(`samples.${w.sample}`)}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-bench-300">{t('hints.wb')}</p>
      </Panel>
      <Panel className="col-span-2">
        <DataTable
          columns={columns}
          rows={s.rows}
          selected={s.selected}
          onSelect={s.select}
          onRecord={() => selected !== null && s.addRow({ sample: WESTERN_BLOT[selected].sample, bands: WESTERN_BLOT[selected].bands })}
          onDelete={s.deleteRow}
          onClear={s.clearRows}
          canRecord={developed && selected !== null && !recorded.includes(WESTERN_BLOT[selected].sample)}
        />
      </Panel>
    </div>
  )
}
