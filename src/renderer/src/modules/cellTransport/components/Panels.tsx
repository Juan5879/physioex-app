import type { CSSProperties, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { RunTable as SharedRunTable } from '@/shared/components/RunTable'
import { Stepper } from '@/shared/components/Stepper'
import { Button, Field, Light, MiniTable, Readout } from '@/shared/components/ui'
import { splitUnit } from '@/shared/lib/format'
import { CONC, MWCO, TIMER, type SoluteId } from '../model/constants'
import type { Conc } from '../model/transport'
import type { RunRecord } from '../store'
import { fix, MEMBRANE_COLORS } from './Apparatus'

export const clampStep = (v: number, d: number, r: { min: number; max: number; step: number }): number =>
  Math.min(r.max, Math.max(r.min, Math.round((v + d * r.step) * 100) / 100))

/** Controles de un vaso: concentración de cada soluto, Dispensar, Vaciar, Agua desionizada */
export function BeakerControls({
  solutes,
  setting,
  unit,
  locked,
  full,
  busy,
  canFlush,
  onChange,
  onDispense,
  onFlush,
  onDeionized
}: {
  solutes: SoluteId[]
  setting: Conc
  unit: string
  /** controles bloqueados (vaso lleno o corrida en curso) */
  locked: boolean
  full: boolean
  busy: boolean
  canFlush: boolean
  onChange: (s: SoluteId, v: number) => void
  onDispense: () => void
  onFlush: () => void
  onDeionized: () => void
}): ReactNode {
  const { t } = useTranslation('cellTransport')
  const allZero = solutes.every((s) => (setting[s] ?? 0) === 0)
  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        {solutes.map((s) => {
          const v = setting[s] ?? 0
          const name = t(`controlSolutes.${s}`, { defaultValue: t(`solutes.${s}`) })
          return (
            <Stepper
              key={s}
              block
              label={name}
              unit={unit}
              display={fix(v, 2)}
              edit={{ ...CONC, value: v, onChange: (nv) => onChange(s, nv) }}
              disabled={locked}
              canDecrement={v > CONC.min}
              canIncrement={v < CONC.max}
              onStep={(d) => onChange(s, clampStep(v, d, CONC))}
            />
          )
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={onDispense} disabled={full || busy}>
          {t('actions.dispense')}
        </Button>
        <Button size="sm" onClick={onFlush} disabled={!canFlush}>
          {t('actions.flush')}
        </Button>
        <Button size="sm" onClick={onDeionized} disabled={full || busy || allZero}>
          {t('actions.deionized')}
        </Button>
      </div>
    </>
  )
}

/** Membranas de diálisis (20, 50, 100, 200 MWCO): clic o arrastre al soporte */
export function MembraneRack({
  current,
  onPick,
  disabled
}: {
  current: number | null
  onPick: (mwco: number) => void
  disabled: boolean
}): ReactNode {
  const { t } = useTranslation('cellTransport')
  return (
    <div className="px-field" title={t('messages.pickMembrane')}>
      <span className="px-label">{t('panels.membraneHint')}</span>
      <div className="px-options grid-cols-[repeat(auto-fit,minmax(104px,1fr))]">
        {MWCO.map((m) => (
          <button
            key={m}
            type="button"
            className="px-option !flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-45"
            aria-pressed={current === m}
            disabled={disabled}
            draggable={!disabled && current !== m}
            onDragStart={(e) => e.dataTransfer.setData('text/membrane', String(m))}
            onClick={() => onPick(m)}
            style={{ '--c': MEMBRANE_COLORS[m] } as CSSProperties}
          >
            <span className="swatch !h-5 !w-2.5" />
            <span className="v whitespace-nowrap">{m} MWCO</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/** Temporizador, botón Iniciar/Pausa/Reanudar y tiempo transcurrido */
export function TimerPanel({
  maxTime,
  elapsed,
  running,
  locked,
  label,
  onChangeTime,
  onStart
}: {
  maxTime: number
  elapsed: number | null
  running: boolean
  locked: boolean
  label: string
  onChangeTime: (v: number) => void
  onStart: () => void
}): ReactNode {
  const { t } = useTranslation('cellTransport')
  const tc = useTranslation().t
  const shown = elapsed === null ? maxTime : maxTime - elapsed
  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
      <Stepper
        label={t('fields.timer')}
        display={String(shown)}
        edit={{ ...TIMER, value: maxTime, onChange: onChangeTime }}
        disabled={locked}
        canDecrement={maxTime > TIMER.min}
        canIncrement={maxTime < TIMER.max}
        onStep={(d) => onChangeTime(clampStep(maxTime, d, TIMER))}
      />
      <div className="flex h-[34px] items-center gap-3">
        <Light on={running} label={running ? tc('common.inProgress') : tc('common.stopped')} />
        <Button variant="primary" icon="play" onClick={onStart} className="min-w-28">
          {label}
        </Button>
      </div>
      <Field label={splitUnit(t('fields.elapsed'))?.text ?? t('fields.elapsed')} className="ml-auto">
        <Readout value={String(elapsed ?? 0)} unit="min" />
      </Field>
    </div>
  )
}

/** Tabla de solutos con un valor por fila (velocidades, filtrado, residuo) */
export function SoluteValues({
  solutes,
  header,
  values,
  empty
}: {
  solutes: SoluteId[]
  header: string
  /** `null` = vacío; si no, el texto de cada soluto */
  values: Partial<Record<SoluteId, string>> | null
  empty: string
}): ReactNode {
  const { t } = useTranslation('cellTransport')
  return (
    <MiniTable
      headers={[t('fields.solute'), header]}
      rows={values && solutes.map((s) => [t(`solutes.${s}`), values[s] ?? ''])}
      empty={empty}
    />
  )
}

/**
 * Panel Resultados: lista de corridas con «Registrar datos» y «Borrar corrida», y la tabla de la
 * corrida seleccionada (una fila por soluto).
 */
export function RunTable({
  headers,
  runs,
  canRecord,
  onRecord,
  onDelete
}: {
  headers: string[]
  runs: RunRecord[]
  canRecord: boolean
  onRecord: () => void
  onDelete: (setNum: number) => void
}): ReactNode {
  const { t } = useTranslation('cellTransport')
  const hasHash = runs.some((r) => r.rows.some((row) => row.cells.some((c) => c.endsWith('#'))))
  return (
    <SharedRunTable
      headers={headers}
      runs={runs.map((r) => ({ setNum: r.setNum, rows: r.rows.map((row) => [t(`solutes.${row.solute}`), ...row.cells]) }))}
      canRecord={canRecord}
      onRecord={onRecord}
      onDelete={onDelete}
      footer={hasHash && <p className="px-hint m-0">{t('messages.hashLegend')}</p>}
    />
  )
}

/** Hoja impresa: una tabla por corrida (printExp del original) */
export function PrintRuns({ headers, runs }: { headers: string[]; runs: RunRecord[] }): ReactNode {
  const { t } = useTranslation('cellTransport')
  return (
    <div className="space-y-4">
      {runs.map((r) => (
        <div key={r.setNum}>
          <p className="mb-1 font-semibold">{t('run', { n: r.setNum })}</p>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {headers.map((h) => (
                  <th key={h} className="border border-black px-2 py-1">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {r.rows.map((row) => (
                <tr key={row.solute}>
                  <td className="border border-black px-2 py-1 text-center">{t(`solutes.${row.solute}`)}</td>
                  {row.cells.map((c, i) => (
                    <td key={i} className="border border-black px-2 py-1 text-center">
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {runs.some((r) => r.rows.some((row) => row.cells.some((c) => c.endsWith('#')))) && (
        <p className="text-xs">{t('messages.hashLegend')}</p>
      )}
    </div>
  )
}
