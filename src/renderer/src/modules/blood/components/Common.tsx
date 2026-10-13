import { useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Light, Panel, ReadoutField } from '@/shared/components/ui'
import { useFrameLoop } from '@/shared/lib/useFrameLoop'

/** Botones de las muestras numeradas; las usadas quedan deshabilitadas */
export function SampleBar({
  count,
  selected,
  used = [],
  onSelect,
  label,
  disabled
}: {
  count: number
  selected: number | null
  used?: number[]
  onSelect: (i: number) => void
  label?: string
  disabled?: boolean
}): ReactNode {
  const { t } = useTranslation('blood')
  return (
    <div className="px-field">
      <span className="px-label">{label ?? t('fields.samples')}</span>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: count }, (_, i) => (
          <button
            key={i}
            type="button"
            disabled={disabled || used.includes(i)}
            onClick={() => onSelect(i)}
            aria-pressed={selected === i}
            className="px-reagent !min-h-0 !flex-col !gap-1 !px-2.5 !py-1.5 font-mono !text-xs disabled:cursor-not-allowed disabled:opacity-35"
            style={{ '--c': 'var(--chart-4)' } as CSSProperties}
          >
            <svg viewBox="0 0 14 24" aria-hidden="true">
              <path className="vessel" d="M3 1h8v20a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z" />
              <path className="fill" d="M4.5 10h5v10.5a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5z" />
            </svg>
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Temporizador acelerado (1 min simulado cada 10 frames, medio segundo real):
 * devuelve los minutos transcurridos y si está corriendo.
 */
export function useLabTimer(onDone: () => void): {
  running: boolean
  elapsed: number
  start: (minutes: number) => void
  reset: () => void
} {
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const target = useRef(0)
  const frames = useRef(0)
  useFrameLoop(running, () => {
    frames.current += 1
    if (frames.current < 10) return
    frames.current = 0
    setElapsed((e) => {
      const n = e + 1
      if (n >= target.current) {
        setRunning(false)
        onDone()
      }
      return Math.min(n, target.current)
    })
  })
  return {
    running,
    elapsed,
    start: (minutes) => {
      target.current = minutes
      frames.current = 0
      setElapsed(0)
      if (minutes <= 0) {
        onDone()
        return
      }
      setRunning(true)
    },
    reset: () => {
      setRunning(false)
      setElapsed(0)
    }
  }
}

/** Panel del temporizador: tiempo transcurrido con luz */
export function TimerReadout({ elapsed }: { running?: boolean; elapsed: number }): ReactNode {
  const { t } = useTranslation('blood')
  return <ReadoutField inline label={t('fields.elapsed')} unit="min" value={`${elapsed}`} />
}

/** Distribución común: Muestras | instrumento (con su estado), y Resultados debajo */
export function BloodLayout({
  left,
  right,
  table,
  rightTitle,
  running
}: {
  left: ReactNode
  right: ReactNode
  table: ReactNode
  /** nombre del instrumento (centrífuga, hemoglobinómetro…) */
  rightTitle: string
  /** instrumento funcionando: enciende el LED del panel */
  running?: boolean
}): ReactNode {
  const { t } = useTranslation('blood')
  const tc = useTranslation().t
  return (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)_300px] items-start gap-4">
        <Panel title={t('panels.samples')}>{left}</Panel>
        <Panel
          title={rightTitle}
          actions={running !== undefined && <Light on={running} label={tc(running ? 'common.inProgress' : 'common.stopped')} />}
        >
          {right}
        </Panel>
      </div>
      {table}
    </>
  )
}
