import type { ReactNode } from 'react'

const BLOOD = '#b91c1c'

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
      {lid && <rect x={x - 5} y={y - 10} width={w + 10} height={10} rx={3} fill="#1f2937" />}
      <rect x={x} y={y} width={w} height={h} rx={6} fill="#e5f3f8" fillOpacity={0.2} stroke="#cbd5e1" strokeWidth={2} />
      <rect x={x + 3} y={y + h - 4 - liquid} width={w - 6} height={liquid} rx={4} fill={BLOOD} fillOpacity={0.9} />
      <rect x={x + 8} y={y + 8} width={6} height={h - 20} rx={3} fill="#fff" fillOpacity={0.3} />
      <rect x={x - 3} y={y + h} width={w + 6} height={8} rx={2} fill="#374151" />
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
    <svg viewBox="0 0 640 260" className="w-full">
      <Beaker x={20} y={50} w={150} h={170} level={leftLevel} />
      <Beaker x={rightX} y={50} w={150} h={170} level={1 - leftLevel} lid={false} />
      {/* tubo */}
      <rect x={tubeX} y={cy - thick / 2} width={tubeLen} height={thick} fill="#e5e7eb" fillOpacity={0.35} stroke="#9ca3af" />
      <rect
        x={tubeFillFromRight ? tubeX + tubeLen - filled : tubeX}
        y={cy - thick / 2}
        width={filled}
        height={thick}
        fill={BLOOD}
      />
      <rect x={tubeX - 10} y={cy - 14} width={12} height={28} rx={2} fill="#4b5563" />
      <rect x={rightX - 12} y={cy - 14} width={12} height={28} rx={2} fill="#4b5563" />
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
      <rect x={x} y={232 - r * 2} width={w} height={r * 4} fill={open ? BLOOD : '#7f1d1d'} fillOpacity={open ? 0.9 : 0.5} />
      <rect x={x + w / 2 - 4} y={185} width={8} height={30} fill={open ? '#9ca3af' : '#374151'} />
      <rect x={x + w / 2 - 9} y={open ? 172 : 205} width={18} height={10} rx={2} fill="#6b7280" />
    </g>
  )
  return (
    <svg viewBox="0 0 640 270" className="w-full">
      <Beaker x={20} y={40} w={150} h={170} level={levelL} />
      <Beaker x={245} y={40} w={150} h={170} level={pumpFill} />
      <Beaker x={470} y={40} w={150} h={170} level={levelR} lid={false} />
      {/* émbolo */}
      <rect x={250} y={40 + (1 - pumpFill) * 160} width={140} height={8} fill="#111827" />
      <rect x={316} y={10} width={8} height={30 + (1 - pumpFill) * 160} fill="#6b7280" />
      {tube(170, 75, radiusL, valveL)}
      {tube(395, 75, radiusR, valveR)}
    </svg>
  )
}
