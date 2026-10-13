import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { DataTable, type DataColumn } from '@/shared/components/DataTable'
import { ExperimentTools } from '@/shared/components/ExperimentTools'
import { ToolbarPortal } from '@/shared/components/ToolbarSlot'
import { Panel, ReadoutField } from '@/shared/components/ui'
import { fixed } from '@/shared/lib/format'
import { ProcedurePanel, useProcedure, type ProcedureStep } from '../components/Procedure'
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
    <>
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-4">
      <ToolbarPortal>
        <ExperimentTools lab={t('title')} experiment={t('experiments.elisa')} columns={columns} rows={s.rows} />
      </ToolbarPortal>
      <ProcedurePanel steps={STEPS} proc={proc} unit="h" />
      <Panel title={t('panels.plate')} bodyClassName="justify-items-center">
        <div className="px-well flex flex-wrap justify-center gap-3 p-4">
          {ELISA.map((w, i) => (
            <button
              key={w.sample}
              type="button"
              disabled={!developed}
              onClick={() => setMeasured(i)}
              aria-pressed={measured === i}
              className="px-option !gap-1.5 disabled:cursor-not-allowed"
            >
              <span
                className="block size-12 rounded-full border-2 border-[color:var(--border-strong)]"
                style={{ background: developed ? `rgb(${w.color.join(',')})` : proc.done >= 2 ? 'var(--chart-3)' : 'var(--surface-sunken)' }}
              />
              <span className="max-w-20 text-center leading-tight">{t(`samples.${w.sample}`)}</span>
            </button>
          ))}
        </div>
        <p className="px-hint m-0">{t('hints.elisa')}</p>
        <ReadoutField inline label={t('fields.od')} value={measured !== null ? fixed(ELISA[measured].od) : '--'} />
      </Panel>
    </div>
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
    </>
  )
}
