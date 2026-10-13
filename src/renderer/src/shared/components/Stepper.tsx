import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { splitUnit } from '@/shared/lib/format'
import { Icon } from './Icon'

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
  /** usar flechas ◀ ▶ a los lados en lugar de − + */
  arrows?: boolean
  /** unidad, dentro del visor */
  unit?: string
  /** ocupar todo el ancho disponible */
  block?: boolean
}

const HOLD_DELAY = 350
const REPEAT_MS = 50 // 20 por segundo, como el original

/**
 * Control numérico con botones −/+. Al mantener presionado repite el paso,
 * igual que los botones del SWF que cambiaban el valor en cada frame.
 */
export function Stepper({
  label: rawLabel,
  display,
  edit,
  onStep,
  canDecrement,
  canIncrement,
  disabled = false,
  arrows = false,
  unit: rawUnit,
  block = false
}: StepperProps): ReactNode {
  const { t } = useTranslation()
  // la unidad va dentro del visor, no en el rótulo: «Voltaje (V)» → «Voltaje» + V
  const split = typeof rawLabel === 'string' ? splitUnit(rawLabel) : null
  const label = split ? split.text : rawLabel
  const unit = rawUnit ?? split?.unit
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
  const empty = !/\d/.test(display)

  const screen = edit ? (
    <span className="px-readout__wrap">
      <NumberField display={display} edit={edit} disabled={disabled} />
      {unit && <span className="u">{unit}</span>}
    </span>
  ) : (
    <output className={`px-readout ${empty ? 'is-empty' : ''}`}>
      {empty ? '——' : display}
      {unit && !empty && <span className="u">{unit}</span>}
    </output>
  )

  const control = arrows ? (
    <div className="px-cursor">
      <StepButton dir={-1} onStep={step} enabled={!disabled && canDec} label={t('common.previous')} arrow>
        <Icon name="chevronLeft" />
      </StepButton>
      {edit ? screen : <span className="px-readout__wrap">{screen}</span>}
      <StepButton dir={1} onStep={step} enabled={!disabled && canInc} label={t('common.next')} arrow>
        <Icon name="chevronRight" />
      </StepButton>
    </div>
  ) : (
    <div className={`px-stepper ${block ? 'px-stepper--block' : ''} ${disabled ? 'is-disabled' : ''}`}>
      {screen}
      <StepButton dir={-1} onStep={step} enabled={!disabled && canDec} label={t('common.decrease')}>
        −
      </StepButton>
      <StepButton dir={1} onStep={step} enabled={!disabled && canInc} label={t('common.increase')}>
        +
      </StepButton>
    </div>
  )

  if (!label) return control
  return (
    <div className="px-field">
      <span className="px-label">{label}</span>
      {control}
    </div>
  )
}

function StepButton({
  dir,
  onStep,
  enabled,
  label,
  arrow = false,
  children
}: {
  dir: 1 | -1
  onStep: (dir: 1 | -1) => void
  enabled: boolean
  label: string
  arrow?: boolean
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
      aria-label={label}
      className={arrow ? 'px-btn px-btn--sm' : undefined}
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
      value={draft ?? (/\d/.test(display) ? display : '——')}
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
      className={`px-readout ${disabled ? 'is-empty' : ''}`}
    />
  )
}
