import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { DataTable, type DataColumn } from '@/shared/components/DataTable'
import { ExperimentTools } from '@/shared/components/ExperimentTools'
import { ToolbarPortal } from '@/shared/components/ToolbarSlot'
import { Button, Light } from '@/shared/components/ui'
import { BloodLayout, SampleBar } from '../components/Common'
import { TYPING, bloodType, type Serum } from '../model/blood'
import { useTypeStore, type TypeRow } from '../store'

const SERA: Serum[] = ['A', 'B', 'Rh']
/** color de cada suero (tempColour del original) */
const SERUM_COLOR: Record<Serum, string> = { A: '#99CCFF', B: '#FFFF00', Rh: '#FFFFFF' }

export function typeColumns(t: TFunction): DataColumn<TypeRow>[] {
  const pn = (v: boolean): string => t(v ? 'values.positive' : 'values.negative')
  return [
    { key: 'sample', header: t('columns.sample'), value: (r) => r.sample, format: (r) => String(r.sample) },
    { key: 'A', header: t('columns.antiA'), value: () => NaN, format: (r) => pn(r.agglutination.A) },
    { key: 'B', header: t('columns.antiB'), value: () => NaN, format: (r) => pn(r.agglutination.B) },
    { key: 'Rh', header: t('columns.antiRh'), value: () => NaN, format: (r) => pn(r.agglutination.Rh) },
    { key: 'type', header: t('columns.type'), value: () => NaN, format: (r) => bloodType(r.agglutination) }
  ]
}

/** Actividad 4: grupo ABO y Rh con sueros anti-A, anti-B y anti-Rh */
export function Typing(): ReactNode {
  const { t } = useTranslation('blood')
  const s = useTypeStore()
  const [sample, setSample] = useState<number | null>(null)
  const [mixed, setMixed] = useState(false)
  const [lit, setLit] = useState(false)
  const recorded = s.rows.map((r) => r.sample - 1)
  const columns = typeColumns(t)
  const result = sample !== null ? TYPING[sample] : null

  return (
    <BloodLayout
      left={
        <>
          <ToolbarPortal>
            <ExperimentTools lab={t('title')} experiment={t('experiments.type')} columns={columns} rows={s.rows} />
          </ToolbarPortal>
          <SampleBar
            count={TYPING.length}
            selected={sample}
            used={recorded}
            onSelect={(i) => {
              setSample(i)
              setMixed(false)
              setLit(false)
            }}
          />
          <div className="flex justify-center gap-6 rounded-xl bg-bench-900 p-4">
            {SERA.map((serum) => (
              <div key={serum} className="flex flex-col items-center gap-1">
                <svg viewBox="0 0 60 60" className="h-20 w-20">
                  <circle cx={30} cy={30} r={26} fill={lit ? '#f8fafc' : '#cbd5e1'} stroke="#64748b" />
                  {sample !== null && mixed && (
                    result?.[serum] ? (
                      // aglutinación: grumos
                      Array.from({ length: 9 }, (_, k) => (
                        <circle key={k} cx={18 + (k % 3) * 12} cy={18 + Math.floor(k / 3) * 12} r={4} fill="#7f1d1d" />
                      ))
                    ) : (
                      <circle cx={30} cy={30} r={20} fill="#dc2626" fillOpacity={0.75} />
                    )
                  )}
                  {sample !== null && !mixed && <circle cx={30} cy={30} r={8} fill="#dc2626" />}
                </svg>
                <span className="rounded px-2 text-xs font-semibold text-black" style={{ background: SERUM_COLOR[serum] }}>
                  Anti-{serum}
                </span>
              </div>
            ))}
          </div>
        </>
      }
      right={
        <>
          <Button variant="primary" onClick={() => setMixed(true)} disabled={sample === null || mixed}>
            {t('actions.addSera')}
          </Button>
          <div className="flex items-center gap-2">
            <Light on={lit} />
            <Button onClick={() => setLit(!lit)} disabled={!mixed}>
              {t('actions.observe')}
            </Button>
          </div>
          {lit && result && (
            <div className="rounded-lg border border-bench-500 p-2 text-sm">
              {SERA.map((sr) => `Anti-${sr}: ${t(result[sr] ? 'values.positive' : 'values.negative')}`).join(' · ')}
            </div>
          )}
        </>
      }
      table={
        <DataTable
          columns={columns}
          rows={s.rows}
          selected={s.selected}
          onSelect={s.select}
          onRecord={() => {
            if (sample === null) return
            s.addRow({ sample: sample + 1, agglutination: TYPING[sample] })
            setSample(null)
            setMixed(false)
            setLit(false)
          }}
          onDelete={s.deleteRow}
          onClear={s.clearRows}
          canRecord={sample !== null && mixed && lit && !recorded.includes(sample)}
        />
      }
    />
  )
}
