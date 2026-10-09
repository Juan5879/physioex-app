import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Readout } from './ui'

/** Valor editable: lo escrito se ajusta al paso y se limita a [min, max] */
export interface StepperEdit {
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}

interface StepperProps {
  label?: ReactNode
  /** texto mostrado en la pantalla */
  display: string
  /**
   * Con `edit` la pantalla es un campo donde se puede escribir el valor, y los botones
   * −/+ se derivan de él (no hace falta `onStep`, `canDecrement` ni `canIncrement`).
   */
  edit?: StepperEdit
  onStep?: (dir: 1 | -1) => void
  canDecrement?: boolean
  canIncrement?: boolean
  disabled?: boolean
  /** usar flechas ◀ ▶ en lugar de − + */
  arrows?: boolean
}

const HOLD_DELAY = 350
const REPEAT_MS = 50 // 20 por segundo, como el original

/**
 * Control numérico con botones −/+. Al mantener presionado repite el paso,
 * igual que los botones del SWF que cambiaban el valor en cada frame.
 */
export function Stepper({
  label,
  display,
  edit,
  onStep,
  canDecrement,
  canIncrement,
  disabled = false,
  arrows = false
}: StepperProps): ReactNode {
  // con `edit` los botones suman o restan un paso al valor actual
  const latest = useRef(edit)
  latest.current = edit
  const step =
    onStep ??
    ((dir: 1 | -1) => {
      const e = latest.current
      if (e) e.onChange(snapToStep(e.value + dir * e.step, e))
    })
  const canDec = canDecrement ?? (edit ? edit.value > edit.min : false)
  const canInc = canIncrement ?? (edit ? edit.value < edit.max : false)

  return (
    <div className="flex flex-col items-center gap-1">
      {label && <span className="text-center text-sm font-semibold text-bench-100">{label}</span>}
      <div className="flex items-center gap-1">
        {arrows && (
          <StepButton dir={-1} onStep={step} enabled={!disabled && canDec}>
            ◀
          </StepButton>
        )}
        {edit ? (
          <NumberField display={display} edit={edit} disabled={disabled} />
        ) : (
          <Readout value={display} dim={disabled} />
        )}
        {!arrows && (
          <StepButton dir={-1} onStep={step} enabled={!disabled && canDec}>
            −
          </StepButton>
        )}
        <StepButton dir={1} onStep={step} enabled={!disabled && canInc}>
          {arrows ? '▶' : '+'}
        </StepButton>
      </div>
    </div>
  )
}

function StepButton({
  dir,
  onStep,
  enabled,
  children
}: {
  dir: 1 | -1
  onStep: (dir: 1 | -1) => void
  enabled: boolean
  children: ReactNode
}): ReactNode {
  const timers = useRef<{ hold?: number; repeat?: number }>({})
  const onStepRef = useRef(onStep)
  onStepRef.current = onStep

  const stop = (): void => {
    window.clearTimeout(timers.current.hold)
    window.clearInterval(timers.current.repeat)
    timers.current = {}
  }

  useEffect(() => {
    if (!enabled) stop()
  }, [enabled])
  useEffect(() => stop, [])

  const start = (): void => {
    if (!enabled) return
    onStepRef.current(dir)
    timers.current.hold = window.setTimeout(() => {
      timers.current.repeat = window.setInterval(() => onStepRef.current(dir), REPEAT_MS)
    }, HOLD_DELAY)
  }

  return (
    <button
      type="button"
      disabled={!enabled}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          if (enabled) onStep(dir)
        }
      }}
      className="flex size-8 items-center justify-center rounded border border-bench-300 bg-bench-100 text-lg font-bold text-bench-900 hover:bg-white active:bg-bench-300 disabled:opacity-35"
    >
      {children}
    </button>
  )
}

/** Ajusta un valor al paso del control (contado desde `min`) y lo limita al rango */
export function snapToStep(v: number, { min, max, step }: { min: number; max: number; step: number }): number {
  const snapped = min + Math.round((v - min) / step) * step
  return Math.min(max, Math.max(min, Math.round(snapped * 1e6) / 1e6))
}

/**
 * Pantalla LCD editable. Muestra `display`; al enfocarla se puede escribir un número
 * (acepta coma decimal), que se confirma con Enter o al salir. Escape cancela.
 */
function NumberField({
  display,
  edit,
  disabled
}: {
  display: string
  edit: StepperEdit
  disabled: boolean
}): ReactNode {
  const [draft, setDraft] = useState<string | null>(null)
  const cancelled = useRef(false)

  const commit = (): void => {
    if (draft === null) return
    if (cancelled.current) {
      cancelled.current = false
      setDraft(null)
      return
    }
    const text = draft.replace(',', '.').trim()
    setDraft(null)
    const v = Number(text)
    if (text === '' || !Number.isFinite(v)) return
    const next = snapToStep(v, edit)
    if (next !== edit.value) edit.onChange(next)
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={draft ?? display}
      disabled={disabled}
      aria-label={`${edit.min} – ${edit.max}`}
      title={`${edit.min} – ${edit.max}`}
      onFocus={(e) => {
        // pantallas como "----" se vacían para escribir directo
        setDraft(/\d/.test(display) ? display : '')
        e.currentTarget.select()
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') {
          // el blur que sigue no debe confirmar lo escrito
          cancelled.current = true
          e.currentTarget.blur()
        }
      }}
      className={`w-20 min-w-20 rounded border border-black bg-black px-2 py-1 text-right font-mono text-lg leading-tight tabular-nums outline-none select-text focus:border-sky-400 focus:ring-1 focus:ring-sky-400 disabled:cursor-not-allowed ${disabled ? 'text-lcd/40' : 'text-lcd'}`}
    />
  )
}
