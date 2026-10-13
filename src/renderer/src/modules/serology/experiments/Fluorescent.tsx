import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { DataTable, type DataColumn } from '@/shared/components/DataTable'
import { ExperimentTools } from '@/shared/components/ExperimentTools'
import { ToolbarPortal } from '@/shared/components/ToolbarSlot'
import { Hint, Panel } from '@/shared/components/ui'
import { ProcedurePanel, useProcedure, type ProcedureStep } from '../components/Procedure'
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
    <>
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-4">
      <ToolbarPortal>
        <ExperimentTools lab={t('title')} experiment={t('experiments.dfa')} columns={columns} rows={s.rows} />
      </ToolbarPortal>
      <ProcedurePanel steps={STEPS} proc={proc} unit="min" />
      <Panel title={t('panels.microscope')} bodyClassName="justify-items-center">
        <div className="px-seg flex-wrap" role="group" aria-label={t('fields.microscope')}>
          {DFA.map((d, i) => (
            <button
              key={d.label}
              type="button"
              aria-pressed={slide === i}
              onClick={() => setSlide(i)}
              disabled={!proc.finished || recorded.includes(d.label)}
            >
              {t(`samples.${d.label}`)}
            </button>
          ))}
        </div>
        <svg viewBox="0 0 100 100" className="px-scope" role="img" aria-label={t('fields.microscope')}>
          {field?.cells.map((c, i) => (
            <ellipse key={i} cx={c.x} cy={c.y} rx={4.5} ry={3.5} style={{ fill: 'var(--chart-4)' }} fillOpacity={0.35} />
          ))}
          {field?.elementary.map((c, i) => (
            <circle key={i} cx={c.x} cy={c.y} r={1.3} />
          ))}
        </svg>
        <Hint>{t('hints.dfa')}</Hint>
        <div className="flex items-center gap-3">
          <span className="px-label">{t('fields.chlamydia')}</span>
          <div className="px-seg" role="group" aria-label={t('fields.chlamydia')}>
            <button type="button" onClick={() => record(true)} disabled={!field}>
              {t('values.present')}
            </button>
            <button type="button" onClick={() => record(false)} disabled={!field}>
              {t('values.absent')}
            </button>
          </div>
        </div>
      </Panel>
    </div>
      <DataTable columns={columns} rows={s.rows} selected={s.selected} onSelect={s.select} onRecord={() => undefined} onDelete={s.deleteRow} onClear={s.clearRows} canRecord={false} />
    </>
  )
}
