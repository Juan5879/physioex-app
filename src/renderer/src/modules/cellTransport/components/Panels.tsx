import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Stepper } from '@/shared/components/Stepper'
import { Button, Light, Modal, Readout } from '@/shared/components/ui'
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
  dispensing,
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
  dispensing: boolean
  onChange: (s: SoluteId, v: number) => void
  onDispense: () => void
  onFlush: () => void
  onDeionized: () => void
}): ReactNode {
  const { t } = useTranslation('cellTransport')
  const allZero = solutes.every((s) => (setting[s] ?? 0) === 0)
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(165px,1fr))] gap-x-2 gap-y-2">
        {solutes.map((s) => {
          const v = setting[s] ?? 0
          const name = t(`controlSolutes.${s}`, { defaultValue: t(`solutes.${s}`) })
          return (
            <Stepper
              key={s}
              label={`${name} (${unit})`}
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
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Light on={dispensing} />
        <Button onClick={onDispense} disabled={full || busy}>
          {t('actions.dispense')}
        </Button>
        <Button onClick={onFlush} disabled={!canFlush}>
          {t('actions.flush')}
        </Button>
        <Button onClick={onDeionized} disabled={full || busy || allZero}>
          {t('actions.deionized')}
        </Button>
      </div>
    </div>
  )
}

/** Membranas de diálisis (20, 50, 100, 200 MWCO): clic o arrastre al soporte */
export function MembraneRack({
  current,
  onPick,
  disabled,
  vertical = true
}: {
  current: number | null
  onPick: (mwco: number) => void
  disabled: boolean
  vertical?: boolean
}): ReactNode {
  const { t } = useTranslation('cellTransport')
  return (
    <div className="flex flex-col items-center gap-2" title={t('messages.pickMembrane')}>
      <h3 className="text-center text-sm font-semibold text-bench-100">{t('panels.dialysis')}</h3>
      <div className={`grid gap-2 ${vertical ? 'grid-cols-2' : 'grid-cols-4'}`}>
        {MWCO.map((m) => {
          const inHolder = current === m
          return (
            <button
              key={m}
              type="button"
              disabled={disabled}
              draggable={!disabled && !inHolder}
              onDragStart={(e) => e.dataTransfer.setData('text/membrane', String(m))}
              onClick={() => onPick(m)}
              className={`flex flex-col items-center gap-1 rounded-lg border p-1.5 text-xs font-semibold disabled:opacity-40 ${inHolder ? 'border-sky-400 bg-bench-800' : 'border-bench-500 bg-bench-900 hover:bg-bench-800'}`}
            >
              <span
                className={`block rounded ${vertical ? 'h-20 w-4' : 'h-4 w-20'} ${inHolder ? 'opacity-20' : ''}`}
                style={{ background: MEMBRANE_COLORS[m] }}
              />
              {m} (MWCO)
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Temporizador, tiempo transcurrido y botón Iniciar/Pausa/Reanudar */
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
  const shown = elapsed === null ? maxTime : maxTime - elapsed
  return (
    <div className="flex flex-wrap items-end justify-center gap-4">
      <Stepper
        label={t('fields.timer')}
        display={String(shown)}
        edit={{ ...TIMER, value: maxTime, onChange: onChangeTime }}
        disabled={locked}
        canDecrement={maxTime > TIMER.min}
        canIncrement={maxTime < TIMER.max}
        onStep={(d) => onChangeTime(clampStep(maxTime, d, TIMER))}
      />
      <div className="flex items-center gap-2 pb-0.5">
        <Light on={running} />
        <Button variant="primary" onClick={onStart} className="min-w-24">
          {label}
        </Button>
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="text-sm font-semibold text-bench-100">{t('fields.elapsed')}</span>
        <Readout value={String(elapsed ?? 0)} />
      </div>
    </div>
  )
}

/** Tabla de solutos con un valor por fila (velocidades, filtrado, residuo) */
export function SoluteValues({
  solutes,
  header,
  values
}: {
  solutes: SoluteId[]
  header: string
  /** `null` = vacío; si no, el texto de cada soluto */
  values: Partial<Record<SoluteId, string>> | null
}): ReactNode {
  const { t } = useTranslation('cellTransport')
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="text-bench-100">
          <th className="px-1 font-semibold">{t('fields.solute')}</th>
          <th className="px-1 font-semibold">{header}</th>
        </tr>
      </thead>
      <tbody className="font-mono text-lcd">
        {solutes.map((s) => (
          <tr key={s} className="border-t border-bench-700 bg-black">
            <td className="px-2 py-0.5 text-center">{values ? t(`solutes.${s}`) : '\u00a0'}</td>
            <td className="px-2 py-0.5 text-right tabular-nums">{values?.[s] ?? ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/**
 * Lista de corridas con "Registrar datos" y "Borrar corrida", y la tabla de la corrida
 * seleccionada (una fila por soluto), como el panel inferior del original.
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
  const tc = useTranslation().t
  const [selected, setSelected] = useState<number | null>(null)
  const [confirm, setConfirm] = useState(false)
  // por defecto se muestra la última corrida registrada
  const shown = runs.find((r) => r.setNum === selected) ?? runs[runs.length - 1] ?? null
  const hasHash = runs.some((r) => r.rows.some((row) => row.cells.some((c) => c.endsWith('#'))))

  return (
    <div className="flex gap-3">
      <div className="flex w-24 shrink-0 flex-col">
        <span className="mb-1 text-center text-sm font-semibold text-bench-100">{t('fields.runNumber')}</span>
        <div className="h-36 overflow-y-auto rounded border border-black bg-black font-mono text-lcd">
          {runs.map((r) => (
            <button
              key={r.setNum}
              type="button"
              onClick={() => setSelected(r.setNum)}
              className={`block w-full px-2 py-0.5 text-center ${shown?.setNum === r.setNum ? 'bg-sky-700 text-white' : 'hover:bg-bench-800'}`}
            >
              {r.setNum}
            </button>
          ))}
        </div>
      </div>
      <div className="flex w-36 shrink-0 flex-col justify-center gap-1.5">
        <Button
          onClick={() => {
            onRecord()
            setSelected(null)
          }}
          disabled={!canRecord}
        >
          {t('actions.record')}
        </Button>
        <Button onClick={() => setConfirm(true)} disabled={!shown}>
          {t('actions.deleteRun')}
        </Button>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="h-40 overflow-y-auto rounded border border-black bg-black">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-bench-600">
              <tr>
                {headers.map((h) => (
                  <th key={h} className="px-2 py-1 text-center font-semibold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="font-mono text-lcd">
              {shown?.rows.map((row) => (
                <tr key={row.solute} className="border-t border-bench-700">
                  <td className="px-2 py-1 text-center">{t(`solutes.${row.solute}`)}</td>
                  {row.cells.map((c, i) => (
                    <td key={i} className="px-2 py-1 text-center tabular-nums">
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {!shown && <p className="p-3 text-center text-sm text-bench-300">{t('messages.noRuns')}</p>}
        </div>
        {hasHash && <p className="mt-1 text-xs text-bench-300">{t('messages.hashLegend')}</p>}
      </div>

      {confirm && shown && (
        <Modal title={t('actions.deleteRun')} onClose={() => setConfirm(false)}>
          <p className="mb-5 text-bench-100">{t('messages.deleteRun', { run: shown.setNum })}</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              {tc('common.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                onDelete(shown.setNum)
                setSelected(null)
                setConfirm(false)
              }}
            >
              {t('actions.deleteRun')}
            </Button>
          </div>
        </Modal>
      )}
    </div>
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
