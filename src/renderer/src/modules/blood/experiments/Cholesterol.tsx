import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { DataTable, type DataColumn } from '@/shared/components/DataTable'
import { ExperimentTools } from '@/shared/components/ExperimentTools'
import { ToolbarPortal } from '@/shared/components/ToolbarSlot'
import { Button } from '@/shared/components/ui'
import { BloodLayout, TimerReadout, useLabTimer } from '../components/Common'
import { CHOLESTEROL, CHOLESTEROL_MINUTES, CHOL_WHEEL, cholColor } from '../model/blood'
import { useCholStore, type CholRow } from '../store'

export function cholColumns(t: TFunction): DataColumn<CholRow>[] {
  return [
    { key: 'patient', header: t('columns.sample'), value: (r) => r.patient, format: (r) => String(r.patient) },
    { key: 'value', header: t('columns.chol'), value: (r) => r.value, format: (r) => (r.value === 300 ? '300 +' : String(r.value)) },
    { key: 'level', header: t('columns.level'), value: () => NaN, format: (r) => t(`levels.${r.level}`) }
  ]
}

type Step = 'start' | 'wiped' | 'lanced' | 'timing' | 'ready'

/** Actividad 5: colesterol total con tiras reactivas y escala de colores */
export function Cholesterol(): ReactNode {
  const { t } = useTranslation('blood')
  const s = useCholStore()
  const [patient, setPatient] = useState(0)
  const [step, setStep] = useState<Step>('start')
  const [choice, setChoice] = useState<number | null>(null)
  const clock = useLabTimer(() => setStep('ready'))
  const recorded = s.rows.map((r) => r.patient - 1)
  const columns = cholColumns(t)

  const reset = (): void => {
    setStep('start')
    setChoice(null)
    clock.reset()
  }

  return (
    <BloodLayout
      left={
        <>
          <ToolbarPortal>
            <ExperimentTools lab={t('title')} experiment={t('experiments.chol')} columns={columns} rows={s.rows} />
          </ToolbarPortal>
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">
              {t('fields.patient')} #{patient + 1}
            </span>
            <Button
              onClick={() => {
                setPatient((p) => (p + 1) % CHOLESTEROL.length)
                reset()
              }}
              disabled={clock.running}
            >
              {t('actions.nextPatient')}
            </Button>
          </div>
          <p className="text-xs text-bench-300">{t('hints.chol')}</p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <svg viewBox="-60 -60 120 120" className="h-56 w-56">
              {CHOL_WHEEL.map((w, i) => {
                const a0 = ((i * 60 - 120) * Math.PI) / 180
                const a1 = (((i + 1) * 60 - 120) * Math.PI) / 180
                const r = 50
                const d = `M 0 0 L ${r * Math.cos(a0)} ${r * Math.sin(a0)} A ${r} ${r} 0 0 1 ${r * Math.cos(a1)} ${r * Math.sin(a1)} Z`
                const am = (a0 + a1) / 2
                return (
                  <g key={w.value} onClick={() => step === 'ready' && setChoice(w.value)} className={step === 'ready' ? 'cursor-pointer' : ''}>
                    <path d={d} fill={w.color} stroke={choice === w.value ? '#38bdf8' : '#fff'} strokeWidth={choice === w.value ? 3 : 1} />
                    <text x={34 * Math.cos(am)} y={34 * Math.sin(am) + 3} textAnchor="middle" fontSize={8} fill="#0f172a" fontWeight={700}>
                      {w.value === 300 ? '300+' : w.value}
                    </text>
                  </g>
                )
              })}
            </svg>
            <div className="flex flex-col items-center gap-1">
              <div
                className="h-24 w-10 rounded border border-bench-300"
                style={{ background: step === 'ready' ? cholColor(CHOLESTEROL[patient]) : step === 'timing' ? '#a3e635' : '#f8fafc' }}
              />
              <span className="text-xs text-bench-100">{t('fields.strip')}</span>
            </div>
          </div>
        </>
      }
      right={
        <>
          <Button onClick={() => setStep('wiped')} disabled={step !== 'start'}>
            {t('actions.wipe')}
          </Button>
          <Button onClick={() => setStep('lanced')} disabled={step !== 'wiped'}>
            {t('actions.lancet')}
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setStep('timing')
              clock.start(CHOLESTEROL_MINUTES)
            }}
            disabled={step !== 'lanced'}
          >
            {t('actions.strip')}
          </Button>
          <TimerReadout running={clock.running} elapsed={clock.elapsed} />
          <Button onClick={reset} disabled={clock.running}>
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
          onRecord={() => {
            if (choice === null) return
            const w = CHOL_WHEEL.find((x) => x.value === choice)
            s.addRow({ patient: patient + 1, value: choice, level: w?.level ?? 'na' })
          }}
          onDelete={s.deleteRow}
          onClear={s.clearRows}
          canRecord={step === 'ready' && choice !== null && !recorded.includes(patient)}
        />
      }
    />
  )
}
