import { useCallback, useRef, useState } from 'react'
import { useFrameLoop } from './useFrameLoop'

interface SweepJob<P> {
  points: P[]
  perFrame: number
  shown: number
  onFrame: (visible: P[]) => void
  onDone: () => void
}

/**
 * Revela un trazo precalculado poco a poco, como el barrido del osciloscopio original
 * (que calculaba N puntos por frame a 20 fps).
 */
export function useSweep<P>(): {
  running: boolean
  start: (points: P[], perFrame: number, onFrame: (visible: P[]) => void, onDone: () => void) => void
} {
  const [running, setRunning] = useState(false)
  const job = useRef<SweepJob<P> | null>(null)

  useFrameLoop(running, () => {
    const j = job.current
    if (!j) return
    j.shown = Math.min(j.points.length, j.shown + j.perFrame)
    j.onFrame(j.points.slice(0, j.shown))
    if (j.shown >= j.points.length) {
      job.current = null
      setRunning(false)
      j.onDone()
    }
  })

  const start = useCallback(
    (points: P[], perFrame: number, onFrame: (visible: P[]) => void, onDone: () => void) => {
      job.current = { points, perFrame, shown: 0, onFrame, onDone }
      setRunning(true)
    },
    []
  )

  return { running, start }
}
