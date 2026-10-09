import { useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Light } from '@/shared/components/ui'
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

/** Lista de pasos con el botón del paso actual */
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
    <div className="flex flex-col gap-1.5">
      <p className="text-xs text-bench-300">{t('hints.procedure')}</p>
      {steps.map((s, i) => {
        const current = i === proc.done
        const past = i < proc.done
        return (
          <div key={s.key} className="flex items-center gap-2">
            <span className={`w-5 text-center font-mono text-sm ${past ? 'text-lime-400' : 'text-bench-300'}`}>{past ? '✓' : i + 1}</span>
            <Button
              onClick={proc.doStep}
              disabled={!current || proc.incubating}
              className={`flex-1 text-left ${current ? 'ring-1 ring-sky-400' : ''}`}
            >
              {t(`steps.${s.key}`)}
            </Button>
            {s.incubate && current && (
              <span className="flex items-center gap-1 font-mono text-xs">
                <Light on={proc.incubating} />
                {proc.elapsed}/{s.incubate} {unit}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
