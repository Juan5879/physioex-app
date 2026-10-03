import { useEffect, useRef } from 'react'

/**
 * Ejecuta `tick` a un framerate fijo (por defecto 20 fps, como el SWF original)
 * mientras `active` sea verdadero.
 */
export function useFrameLoop(active: boolean, tick: () => void, fps = 20): void {
  const tickRef = useRef(tick)
  tickRef.current = tick

  useEffect(() => {
    if (!active) return
    const interval = 1000 / fps
    let last = performance.now()
    let raf = requestAnimationFrame(function loop(now) {
      if (now - last >= interval) {
        last = now - ((now - last) % interval)
        tickRef.current()
      }
      raf = requestAnimationFrame(loop)
    })
    return () => cancelAnimationFrame(raf)
  }, [active, fps])
}
