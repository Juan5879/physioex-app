import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { DataTable, type DataColumn } from '@/shared/components/DataTable'
import { ExperimentTools } from '@/shared/components/ExperimentTools'
import { ToolbarPortal } from '@/shared/components/ToolbarSlot'
import { Button, Panel } from '@/shared/components/ui'
import { ProcedureList, useProcedure, type ProcedureStep } from '../components/Procedure'
import { DFA, microscopeField } from '../model/serology'
import { useDfaStore, type DfaRow } from '../store'

const STEPS: ProcedureStep[] = [{ key: 'dfa1' }, { key: 'dfa2' }, { key: 'dfa3' }, { key: 'dfa4', incubate: 30 }, { key: 'dfa5' }, { key: 'dfa6' }]

export function dfaColumns(t: TFunction): DataColumn<DfaRow>[] {
  return [
    { key: 'sample', header: t('columns.sample'), value: () => NaN, format: (r) => t(`samples.${r.sample}`) },
    { key: 'elementary', header: t('columns.elementary'), value: (r) => r.elementary, format: (r) => String(r.elementary) },
    { key: 'chlamydia', header: t('columns.chlamydia'), value: () => NaN, format: (r) => t(r.chlamydia ? 'values.present' : 'values.absent') }
  ]
}

/** Experimento 1: clamidia por anticuerpos fluorescentes directos */
export function Fluorescent(): ReactNode {
  const { t } = useTranslation('serology')
  const s = useDfaStore()
  const proc = useProcedure(STEPS)
  const [slide, setSlide] = useState<number | null>(null)
  // cada portaobjetos muestra un campo al azar, fijo mientras dure la corrida
  const fields = useMemo(() => DFA.map((d) => microscopeField(d)), [proc.finished])
  const recorded = s.rows.map((r) => r.sample)
  const field = slide !== null ? fields[slide] : null
  const columns = dfaColumns(t)

  const record = (chlamydia: boolean): void => {
    if (slide === null || !field) return
    s.addRow({ sample: DFA[slide].label, elementary: field.elementary.length, chlamydia })
    setSlide(null)
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 p-3">
      <ToolbarPortal>
        <ExperimentTools lab={t('title')} experiment={t('experiments.dfa')} columns={columns} rows={s.rows} />
      </ToolbarPortal>
      <Panel>
        <ProcedureList steps={STEPS} proc={proc} unit="min" />
      </Panel>
      <Panel className="flex flex-col items-center gap-3">
        <span className="text-sm font-semibold text-bench-100">{t('fields.microscope')}</span>
        <div className="flex flex-wrap justify-center gap-2">
          {DFA.map((d, i) => (
            <Button key={d.label} onClick={() => setSlide(i)} disabled={!proc.finished || recorded.includes(d.label)} className={slide === i ? 'ring-2 ring-sky-400' : ''}>
              {t(`samples.${d.label}`)}
            </Button>
          ))}
        </div>
        <svg viewBox="0 0 100 100" className="h-60 w-60 rounded-full bg-black">
          {field?.cells.map((c, i) => (
            <ellipse key={i} cx={c.x} cy={c.y} rx={4.5} ry={3.5} fill="#7f1d1d" fillOpacity={0.9} stroke="#b91c1c" strokeWidth={0.4} />
          ))}
          {field?.elementary.map((c, i) => (
            <circle key={i} cx={c.x} cy={c.y} r={1.3} fill="#4ade80" style={{ filter: 'drop-shadow(0 0 1.5px #22c55e)' }} />
          ))}
        </svg>
        <p className="text-center text-xs text-bench-300">{t('hints.dfa')}</p>
        <div className="flex gap-2">
          <span className="self-center text-sm">{t('fields.chlamydia')}:</span>
          <Button onClick={() => record(true)} disabled={!field}>
            {t('values.present')}
          </Button>
          <Button onClick={() => record(false)} disabled={!field}>
            {t('values.absent')}
          </Button>
        </div>
      </Panel>
      <Panel className="col-span-2">
        <DataTable columns={columns} rows={s.rows} selected={s.selected} onSelect={s.select} onRecord={() => undefined} onDelete={s.deleteRow} onClear={s.clearRows} canRecord={false} />
      </Panel>
    </div>
  )
}
