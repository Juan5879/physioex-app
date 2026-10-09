import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { DataTable, type DataColumn } from '@/shared/components/DataTable'
import { ExperimentTools } from '@/shared/components/ExperimentTools'
import { Stepper } from '@/shared/components/Stepper'
import { ToolbarPortal } from '@/shared/components/ToolbarSlot'
import { Button } from '@/shared/components/ui'
import { BloodLayout, SampleBar, TimerReadout, useLabTimer } from '../components/Common'
import { CENTRIFUGE_TIMER, HEMATOCRIT, hematocrit, wbcPercent } from '../model/blood'
import { useHctStore, type HctRow } from '../store'

export function hctColumns(t: TFunction): DataColumn<HctRow>[] {
  return [
    { key: 'sample', header: t('columns.sample'), value: (r) => r.sample, format: (r) => String(r.sample) },
    { key: 'total', header: t('columns.bloodHeight'), value: (r) => r.total, format: (r) => t('values.mm', { v: r.total }) },
    { key: 'rbc', header: t('columns.rbcHeight'), value: (r) => r.rbc, format: (r) => t('values.mm', { v: r.rbc }) },
    { key: 'buffy', header: t('columns.buffyHeight'), value: (r) => r.buffy, format: (r) => t('values.mm', { v: r.buffy }) },
    { key: 'hct', header: t('columns.hct'), value: (r) => hematocrit(r), format: (r) => String(hematocrit(r)) },
    { key: 'wbc', header: t('columns.wbc'), value: (r) => wbcPercent(r), format: (r) => `${wbcPercent(r)}%` }
  ]
}

/** Actividad 1: hematocrito por microcentrifugación */
export function Hematocrit(): ReactNode {
  const { t } = useTranslation('blood')
  const s = useHctStore()
  const [loaded, setLoaded] = useState<number[]>([])
  const [timer, setTimer] = useState<number>(CENTRIFUGE_TIMER.initial)
  const [spun, setSpun] = useState(false)
  const [measured, setMeasured] = useState<number | null>(null)
  const clock = useLabTimer(() => setSpun(true))
  const recorded = s.rows.map((r) => r.sample - 1)
  const columns = hctColumns(t)

  return (
    <BloodLayout
      left={
        <>
          <ToolbarPortal>
            <ExperimentTools lab={t('title')} experiment={t('experiments.hct')} columns={columns} rows={s.rows} />
          </ToolbarPortal>
          <p className="text-xs text-bench-300">{t('hints.hct')}</p>
          <SampleBar
            count={HEMATOCRIT.length}
            selected={null}
            used={loaded}
            disabled={clock.running || spun || loaded.length >= 6}
            onSelect={(i) => setLoaded((l) => [...l, i])}
          />
          <div className="flex items-end justify-center gap-3 rounded-lg bg-bench-900 p-3">
            {loaded.map((i) => {
              const smp = HEMATOCRIT[i]
              return (
                <button
                  key={i}
                  type="button"
                  disabled={!spun}
                  onClick={() => setMeasured(i)}
                  className={`flex flex-col items-center gap-1 rounded p-1 ${measured === i ? 'ring-2 ring-sky-400' : ''}`}
                >
                  <svg viewBox="0 0 16 110" className={`h-40 w-5 ${clock.running ? 'animate-pulse' : ''}`}>
                    <rect x={4} y={4} width={8} height={102} rx={3} fill="#e0f2fe" fillOpacity={0.15} stroke="#cbd5e1" />
                    {spun ? (
                      <>
                        <rect x={5} y={105 - smp.rbc} width={6} height={smp.rbc} fill="#991b1b" />
                        <rect x={5} y={105 - smp.rbc - smp.buffy * 2} width={6} height={smp.buffy * 2} fill="#f8fafc" />
                        <rect x={5} y={6} width={6} height={99 - smp.rbc - smp.buffy * 2} fill="#fde68a" fillOpacity={0.8} />
                      </>
                    ) : (
                      <rect x={5} y={6} width={6} height={99} fill="#b91c1c" />
                    )}
                    <rect x={3} y={100} width={10} height={8} fill="#f59e0b" />
                  </svg>
                  <span className="font-mono text-xs">{i + 1}</span>
                </button>
              )
            })}
          </div>
          {measured !== null && spun && (
            <div className="rounded-lg border border-bench-500 p-2 text-sm">
              {t('fields.sample')} {measured + 1}: {t('columns.hct')} {hematocrit(HEMATOCRIT[measured])} · {t('columns.wbc')}{' '}
              {wbcPercent(HEMATOCRIT[measured])}%
            </div>
          )}
        </>
      }
      right={
        <>
          <Stepper
            label={t('fields.timer')}
            display={String(clock.running ? timer - clock.elapsed : timer)}
            disabled={clock.running || spun}
            edit={{ ...CENTRIFUGE_TIMER, value: timer, onChange: setTimer }}
          />
          <Button variant="primary" onClick={() => clock.start(timer)} disabled={clock.running || spun || loaded.length === 0}>
            {t('actions.start')}
          </Button>
          <TimerReadout running={clock.running} elapsed={clock.elapsed} />
          <Button
            onClick={() => {
              setLoaded([])
              setSpun(false)
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
          onRecord={() => measured !== null && s.addRow({ sample: measured + 1, ...HEMATOCRIT[measured] })}
          onDelete={s.deleteRow}
          onClear={s.clearRows}
          canRecord={spun && measured !== null && !recorded.includes(measured)}
        />
      }
    />
  )
}
