import { useEffect, useRef, type ReactNode } from 'react'
import { Readout } from './ui'

interface StepperProps {
  label?: ReactNode
  /** texto mostrado en la pantalla */
  display: string
  onStep: (dir: 1 | -1) => void
  canDecrement: boolean
  canIncrement: boolean
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
  onStep,
  canDecrement,
  canIncrement,
  disabled = false,
  arrows = false
}: StepperProps): ReactNode {
  return (
    <div className="flex flex-col items-center gap-1">
      {label && <span className="text-sm font-semibold text-bench-100">{label}</span>}
      <div className="flex items-center gap-1">
        {arrows && (
          <StepButton dir={-1} onStep={onStep} enabled={!disabled && canDecrement}>
            ◀
          </StepButton>
        )}
        <Readout value={display} dim={disabled} />
        {!arrows && (
          <StepButton dir={-1} onStep={onStep} enabled={!disabled && canDecrement}>
            −
          </StepButton>
        )}
        <StepButton dir={1} onStep={onStep} enabled={!disabled && canIncrement}>
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
