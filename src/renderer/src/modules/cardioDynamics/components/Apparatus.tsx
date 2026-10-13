import type { ReactNode } from 'react'

const BLOOD = 'var(--chart-4)'

/** Vaso con tapa; `level` 0–1 */
export function Beaker({
  x,
  y,
  w,
  h,
  level,
  lid = true
}: {
  x: number
  y: number
  w: number
  h: number
  level: number
  lid?: boolean
}): ReactNode {
  const liquid = Math.max(0, Math.min(1, level)) * (h - 8)
  return (
    <g>
      {lid && <rect className="il-metal" x={x - 5} y={y - 10} width={w + 10} height={6} rx={3} />}
      <rect className="il-glass" x={x} y={y} width={w} height={h} rx={8} />
      <rect x={x + 6} y={y + h - 6 - liquid * 0.97} width={w - 12} height={liquid * 0.97} rx={4} style={{ fill: BLOOD }} />
    </g>
  )
}

/**
 * Resistencia vascular: vaso izquierdo presurizado, tubo de flujo (radio y longitud variables)
 * y vaso derecho que se acerca o aleja con la longitud.
 */
export function VesselApparatus({
  radius,
  length,
  leftLevel,
  tubeFill,
  tubeFillFromRight
}: {
  radius: number
  length: number
  leftLevel: number
  /** fracción del tubo con sangre */
  tubeFill: number
  /** el tubo se vacía desde la izquierda (true) o se llena desde la izquierda (false) */
  tubeFillFromRight: boolean
}): ReactNode {
  const tubeLen = length * 6.9 * 0.85
  const tubeX = 185
  const thick = radius * 4
  const cy = 200
  const rightX = tubeX + tubeLen + 10
  const filled = tubeLen * Math.max(0, Math.min(1, tubeFill))
  return (
    <svg viewBox="0 0 640 260" className="block w-full">
      <Beaker x={20} y={50} w={150} h={170} level={leftLevel} />
      <Beaker x={rightX} y={50} w={150} h={170} level={1 - leftLevel} lid={false} />
      {/* tubo */}
      <rect className="il-glass" x={tubeX} y={cy - thick / 2} width={tubeLen} height={thick} strokeWidth={1.5} />
      <rect
        x={tubeFillFromRight ? tubeX + tubeLen - filled : tubeX}
        y={cy - thick / 2}
        width={filled}
        height={thick}
        style={{ fill: BLOOD }}
      />
      <rect className="il-metal" x={tubeX - 10} y={cy - 14} width={12} height={28} rx={2} />
      <rect className="il-metal" x={rightX - 12} y={cy - 14} width={12} height={28} rx={2} />
    </svg>
  )
}

/** Mecánica de la bomba: vaso fuente, bomba con émbolo y válvulas, vaso de destino */
export function PumpApparatus({
  levelL,
  levelR,
  pumpFill,
  radiusL,
  radiusR,
  valveL,
  valveR
}: {
  levelL: number
  levelR: number
  /** fracción de la cámara de la bomba con sangre (posición del émbolo) */
  pumpFill: number
  radiusL: number
  radiusR: number
  valveL: boolean
  valveR: boolean
}): ReactNode {
  const tube = (x: number, w: number, r: number, open: boolean): ReactNode => (
    <g>
      <rect x={x} y={232 - r * 2} width={w} height={r * 4} style={{ fill: BLOOD }} fillOpacity={open ? 1 : 0.4} />
      <rect className="il-metal" x={x + w / 2 - 3} y={185} width={6} height={30} />
      <rect className={open ? 'il-glass' : 'il-metal'} x={x + w / 2 - 9} y={open ? 172 : 205} width={18} height={10} rx={2} />
    </g>
  )
  return (
    <svg viewBox="0 0 640 270" className="block w-full">
      <Beaker x={20} y={40} w={150} h={170} level={levelL} />
      <Beaker x={245} y={40} w={150} h={170} level={pumpFill} />
      <Beaker x={470} y={40} w={150} h={170} level={levelR} lid={false} />
      {/* émbolo */}
      <rect className="il-metal" x={250} y={40 + (1 - pumpFill) * 160} width={140} height={8} rx={2} />
      <rect className="il-metal" x={316} y={10} width={8} height={30 + (1 - pumpFill) * 160} />
      {tube(170, 75, radiusL, valveL)}
      {tube(395, 75, radiusR, valveR)}
    </svg>
  )
}
