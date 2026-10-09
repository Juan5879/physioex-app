import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { DataTable, type DataColumn } from '@/shared/components/DataTable'
import { ExperimentTools } from '@/shared/components/ExperimentTools'
import { ToolbarPortal } from '@/shared/components/ToolbarSlot'
import { Panel, Readout } from '@/shared/components/ui'
import { fixed } from '@/shared/lib/format'
import { ProcedureList, useProcedure, type ProcedureStep } from '../components/Procedure'
import { ELISA, ELISA_HOURS } from '../model/serology'
import { useElisaStore, type ElisaRow } from '../store'

const STEPS: ProcedureStep[] = [
  { key: 'elisa1' },
  { key: 'elisa2' },
  { key: 'elisa3', incubate: ELISA_HOURS },
  { key: 'elisa4' },
  { key: 'elisa5' },
  { key: 'elisa6', incubate: ELISA_HOURS },
  { key: 'elisa7' },
  { key: 'elisa8', incubate: ELISA_HOURS }
]

export function elisaColumns(t: TFunction): DataColumn<ElisaRow>[] {
  return [
    { key: 'sample', header: t('columns.sample'), value: () => NaN, format: (r) => t(`samples.${r.sample}`) },
    { key: 'od', header: t('columns.od'), value: (r) => r.od, format: (r) => r.od.toFixed(3) }
  ]
}

/** Experimento 3: ELISA indirecto (anticuerpos anti-VIH) */
export function Elisa(): ReactNode {
  const { t } = useTranslation('serology')
  const s = useElisaStore()
  const proc = useProcedure(STEPS)
  const [measured, setMeasured] = useState<number | null>(null)
  const recorded = s.rows.map((r) => r.sample)
  const columns = elisaColumns(t)
  // el color aparece al terminar la última incubación con el sustrato
  const developed = proc.finished

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 p-3">
      <ToolbarPortal>
        <ExperimentTools lab={t('title')} experiment={t('experiments.elisa')} columns={columns} rows={s.rows} />
      </ToolbarPortal>
      <Panel>
        <ProcedureList steps={STEPS} proc={proc} unit="h" />
      </Panel>
      <Panel className="flex flex-col items-center gap-3">
        <div className="flex gap-3 rounded-xl bg-bench-900 p-4">
          {ELISA.map((w, i) => (
            <button
              key={w.sample}
              type="button"
              disabled={!developed}
              onClick={() => setMeasured(i)}
              className={`flex flex-col items-center gap-1 rounded p-1 ${measured === i ? 'ring-2 ring-sky-400' : ''}`}
            >
              <span
                className="block size-12 rounded-full border-2 border-slate-400"
                style={{ background: developed ? `rgb(${w.color.join(',')})` : proc.done >= 2 ? 'rgb(200,200,255)' : '#e2e8f0' }}
              />
              <span className="max-w-20 text-center text-xs leading-tight">{t(`samples.${w.sample}`)}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-bench-300">{t('hints.elisa')}</p>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-bench-100">{t('fields.od')}</span>
          <Readout value={measured !== null ? fixed(ELISA[measured].od) : '--'} />
        </div>
      </Panel>
      <Panel className="col-span-2">
        <DataTable
          columns={columns}
          rows={s.rows}
          selected={s.selected}
          onSelect={s.select}
          onRecord={() => measured !== null && s.addRow({ sample: ELISA[measured].sample, od: ELISA[measured].od })}
          onDelete={s.deleteRow}
          onClear={s.clearRows}
          canRecord={developed && measured !== null && !recorded.includes(ELISA[measured].sample)}
        />
      </Panel>
    </div>
  )
}
