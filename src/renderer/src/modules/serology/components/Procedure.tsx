import { useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/shared/components/Icon'
import { Hint, Panel } from '@/shared/components/ui'
import { useFrameLoop } from '@/shared/lib/useFrameLoop'

export interface ProcedureStep {
  key: string
  /** pasos de incubación: duración simulada (en las unidades del texto) */
  incubate?: number
}

/** frames por unidad de incubación (minuto u hora simulada) */
const FRAMES_PER_UNIT = 4

/**
 * Procedimiento guiado: los pasos se habilitan en orden, como las secuencias de arrastre del
 * original. Las incubaciones avanzan con un temporizador acelerado.
 */
export function useProcedure(steps: ProcedureStep[]): {
  done: number
  finished: boolean
  incubating: boolean
  elapsed: number
  doStep: () => void
  reset: () => void
} {
  const [done, setDone] = useState(0)
  const [incubating, setIncubating] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const frames = useRef(0)
  useFrameLoop(incubating, () => {
    frames.current += 1
    if (frames.current < FRAMES_PER_UNIT) return
    frames.current = 0
    const target = steps[done]?.incubate ?? 0
    const n = elapsed + 1
    setElapsed(n)
    if (n >= target) {
      setIncubating(false)
      setDone((d) => d + 1)
    }
  })
  return {
    done,
    finished: done >= steps.length,
    incubating,
    elapsed,
    doStep: () => {
      const s = steps[done]
      if (!s) return
      if (s.incubate) {
        frames.current = 0
        setElapsed(0)
        setIncubating(true)
      } else setDone((d) => d + 1)
    },
    reset: () => {
      setDone(0)
      setIncubating(false)
      setElapsed(0)
    }
  }
}

/** Panel «Protocolo»: pasos en orden con su estado y, debajo, contenido extra opcional */
export function ProcedurePanel({
  steps,
  proc,
  unit,
  children
}: {
  steps: ProcedureStep[]
  proc: ReturnType<typeof useProcedure>
  unit: string
  children?: ReactNode
}): ReactNode {
  const { t } = useTranslation('serology')
  return (
    <Panel
      title={t('panels.protocol')}
      actions={<span className="px-eyebrow">{t('panels.progress', { done: Math.min(proc.done, steps.length), total: steps.length })}</span>}
    >
      <ProcedureList steps={steps} proc={proc} unit={unit} />
      {children}
    </Panel>
  )
}

/** Lista de pasos (`.px-steps`); el paso actual es el botón que lo ejecuta */
export function ProcedureList({
  steps,
  proc,
  unit
}: {
  steps: ProcedureStep[]
  proc: ReturnType<typeof useProcedure>
  unit: string
}): ReactNode {
  const { t } = useTranslation('serology')
  return (
    <div className="grid gap-3">
      <Hint>{t('hints.procedure')}</Hint>
      <ol className="px-steps">
        {steps.map((s, i) => {
          const current = i === proc.done
          const past = i < proc.done
          return (
            <li
              key={s.key}
              className={`px-step ${past ? 'is-done' : current ? 'is-current' : ''} ${current && proc.incubating ? '!cursor-wait' : ''}`}
              role={current ? 'button' : undefined}
              tabIndex={current && !proc.incubating ? 0 : undefined}
              aria-current={current ? 'step' : undefined}
              onClick={current && !proc.incubating ? proc.doStep : undefined}
              onKeyDown={(e) => {
                if (current && !proc.incubating && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault()
                  proc.doStep()
                }
              }}
            >
              <span className="n">{past ? <Icon name="check" className="!size-3" /> : i + 1}</span>
              <span>{t(`steps.${s.key}`)}</span>
              <span className="s">
                {past
                  ? t('panels.stepDone')
                  : current
                    ? s.incubate && proc.incubating
                      ? `${proc.elapsed}/${s.incubate} ${unit}`
                      : t('panels.stepNext')
                    : ''}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
