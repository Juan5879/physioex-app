import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { DataTable, type DataColumn } from '@/shared/components/DataTable'
import { ExperimentTools } from '@/shared/components/ExperimentTools'
import { ToolbarPortal } from '@/shared/components/ToolbarSlot'
import { Button, Panel } from '@/shared/components/ui'
import { ProcedureList, useProcedure, type ProcedureStep } from '../components/Procedure'
import { ODD_HOURS, ODD_PAIRS, ODD_REAGENTS, type OddIdentity } from '../model/serology'
import { useOddStore, type OddRow } from '../store'

const STEPS: ProcedureStep[] = [{ key: 'odd1' }, { key: 'odd2' }, { key: 'odd3', incubate: ODD_HOURS }]

/** posición de los 5 pocillos en la placa (centro y cuatro alrededor) */
const WELLS: Array<{ x: number; y: number }> = [
  { x: 50, y: 22 },
  { x: 25, y: 50 },
  { x: 50, y: 50 },
  { x: 75, y: 50 },
  { x: 50, y: 78 }
]

export function oddColumns(t: TFunction): DataColumn<OddRow>[] {
  return [
    { key: 'wells', header: t('columns.wells'), value: () => NaN, format: (r) => `${r.wells[0]} – ${r.wells[1]}` },
    { key: 'identity', header: t('columns.identity'), value: () => NaN, format: (r) => t(`values.${r.identity}`) }
  ]
}

/** Experimento 2: identidad de antígenos por doble difusión en agar */
export function Ouchterlony(): ReactNode {
  const { t } = useTranslation('serology')
  const s = useOddStore()
  const proc = useProcedure(STEPS)
  const [choices, setChoices] = useState<Record<string, OddIdentity>>({})
  const filled = proc.done >= 2
  const recorded = s.rows.map((r) => r.wells.join('-'))
  const columns = oddColumns(t)

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 p-3">
      <ToolbarPortal>
        <ExperimentTools lab={t('title')} experiment={t('experiments.odd')} columns={columns} rows={s.rows} />
      </ToolbarPortal>
      <Panel className="flex flex-col gap-3">
        <ProcedureList steps={STEPS} proc={proc} unit="h" />
        <div className="grid grid-cols-5 gap-1 text-center text-xs">
          {ODD_REAGENTS.map((r, i) => (
            <span key={r} className="rounded bg-bench-900 p-1">
              {i + 1}. {t(`reagents.${r}`)}
            </span>
          ))}
        </div>
      </Panel>
      <Panel className="flex flex-col items-center gap-3">
        <svg viewBox="0 0 100 100" className="h-64 w-64">
          <circle cx={50} cy={50} r={46} fill="#e0f2fe" fillOpacity={0.25} stroke="#cbd5e1" />
          {/* líneas de precipitación entre los pares que reaccionan */}
          {proc.finished &&
            ODD_PAIRS.map((p) => {
              const a = WELLS[p.wells[0] - 1]
              const b = WELLS[p.wells[1] - 1]
              const mx = (a.x + b.x) / 2
              const my = (a.y + b.y) / 2
              const dx = b.y - a.y
              const dy = a.x - b.x
              const len = Math.hypot(dx, dy) || 1
              const k = 7 / len
              // la identidad parcial forma un espolón que sobresale de la línea
              const ux = (b.x - a.x) / len
              const uy = (b.y - a.y) / len
              return (
                <g key={p.wells.join('-')} stroke="#f8fafc" strokeWidth={1.4} strokeLinecap="round">
                  <line x1={mx - dx * k} y1={my - dy * k} x2={mx + dx * k} y2={my + dy * k} />
                  {p.identity === 'partial' && (
                    <line x1={mx + dx * k} y1={my + dy * k} x2={mx + dx * k + (dx / len) * 3 + ux * 2} y2={my + dy * k + (dy / len) * 3 + uy * 2} />
                  )}
                </g>
              )
            })}
          {WELLS.map((w, i) => (
            <g key={i}>
              <circle cx={w.x} cy={w.y} r={6} fill={filled ? '#bfdbfe' : proc.done >= 1 ? '#0f172a' : 'transparent'} stroke="#64748b" />
              <text x={w.x} y={w.y + 2.5} textAnchor="middle" fontSize={6} fill="#0f172a" fontWeight={700}>
                {i + 1}
              </text>
            </g>
          ))}
        </svg>
        <p className="text-center text-xs text-bench-300">{t('hints.odd')}</p>
        <div className="flex w-full flex-col gap-1">
          {ODD_PAIRS.map((p) => {
            const key = p.wells.join('-')
            return (
              <div key={key} className="flex items-center gap-2 text-sm">
                <span className="w-20 font-mono">
                  {p.wells[0]} – {p.wells[1]}
                </span>
                <select
                  value={choices[key] ?? ''}
                  disabled={!proc.finished || recorded.includes(key)}
                  onChange={(e) => setChoices((c) => ({ ...c, [key]: e.target.value as OddIdentity }))}
                  className="flex-1 rounded bg-bench-100 px-2 py-1 text-bench-900"
                >
                  <option value="">—</option>
                  {(['complete', 'partial', 'none'] as const).map((o) => (
                    <option key={o} value={o}>
                      {t(`values.${o}`)}
                    </option>
                  ))}
                </select>
                <Button
                  onClick={() => choices[key] && s.addRow({ wells: p.wells, identity: choices[key] })}
                  disabled={!proc.finished || !choices[key] || recorded.includes(key)}
                >
                  ✓
                </Button>
              </div>
            )
          })}
        </div>
      </Panel>
      <Panel className="col-span-2">
        <DataTable columns={columns} rows={s.rows} selected={s.selected} onSelect={s.select} onRecord={() => undefined} onDelete={s.deleteRow} onClear={s.clearRows} canRecord={false} />
      </Panel>
    </div>
  )
}
