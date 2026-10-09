import { useRef } from 'react'
import { useFrameLoop } from '@/shared/lib/useFrameLoop'
import { FRAMES_PER_MINUTE } from '../model/constants'

/**
 * Reloj de la simulación: llama a `onMinute` cada 10 frames a 20 fps (medio segundo real por
 * minuto simulado), como f_nextFrame del original.
 */
export function useMinuteClock(active: boolean, onMinute: () => void, onFrame?: (fraction: number) => void): void {
  const frames = useRef(0)
  useFrameLoop(active, () => {
    frames.current += 1
    if (frames.current >= FRAMES_PER_MINUTE) {
      frames.current = 0
      onMinute()
    }
    onFrame?.(frames.current / FRAMES_PER_MINUTE)
  })
}
