import { useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Light, Panel, Readout } from '@/shared/components/ui'
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
    <div className="flex flex-col items-center gap-2">
      <span className="text-sm font-semibold text-bench-100">{label ?? t('fields.samples')}</span>
      <div className="flex flex-wrap justify-center gap-2">
        {Array.from({ length: count }, (_, i) => (
          <button
            key={i}
            type="button"
            disabled={disabled || used.includes(i)}
            onClick={() => onSelect(i)}
            className={`flex flex-col items-center rounded-lg border px-2 py-1 text-xs font-semibold disabled:opacity-30 ${selected === i ? 'border-sky-400 bg-bench-800' : 'border-bench-500 bg-bench-900 hover:bg-bench-800'}`}
          >
            <svg viewBox="0 0 24 40" className="h-9 w-5">
              <rect x={4} y={2} width={16} height={6} rx={2} fill="#111827" />
              <path d="M 3 10 H 21 V 34 Q 21 38 17 38 H 7 Q 3 38 3 34 Z" fill="#fee2e2" fillOpacity={0.3} stroke="#cbd5e1" />
              <rect x={5} y={18} width={14} height={18} rx={2} fill="#b91c1c" />
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
export function TimerReadout({ running, elapsed }: { running: boolean; elapsed: number }): ReactNode {
  const { t } = useTranslation('blood')
  return (
    <div className="flex items-center gap-2">
      <Light on={running} />
      <span className="text-sm font-semibold text-bench-100">{t('fields.elapsed')}</span>
      <Readout value={`${elapsed}`} />
    </div>
  )
}

/** Distribución común: aparato a la izquierda, controles a la derecha y tabla abajo */
export function BloodLayout({ left, right, table }: { left: ReactNode; right: ReactNode; table: ReactNode }): ReactNode {
  return (
    <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-3 p-3">
      <Panel className="flex flex-col gap-3">{left}</Panel>
      <Panel className="flex flex-col gap-3">{right}</Panel>
      <Panel className="col-span-2">{table}</Panel>
    </div>
  )
}
