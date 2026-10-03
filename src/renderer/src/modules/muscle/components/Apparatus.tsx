import { useEffect, useState, type DragEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

const TOP = 78 // y del tendón superior
const SCALE = 0.95 // px por unidad de altura del original

/** Altura del vientre muscular en px para una longitud (mm), como el original: 150 + (L-50)*2 */
const bellyHeight = (L: number): number => (150 + (L - 50) * 2) * SCALE
/** Ancho del vientre muscular: 40 - (L-50)/5 */
const bellyWidth = (L: number): number => 40 - (L - 50) / 5

interface ApparatusProps {
  /** longitud del músculo en reposo (mm) */
  length: number
  /** acortamiento actual (mm) en contracción isotónica */
  shortening?: number
  /** número que cambia con cada estímulo para disparar la animación */
  stimulusId: number
  /** Contracción isotónica: pesa colgada y plataforma */
  isotonic?: {
    weight: number
    platform: number
    onDropWeight: (w: number) => void
    onRemoveWeight: () => void
    locked: boolean
  }
}

/**
 * Soporte con transductor de fuerza, músculo de rana y electrodo estimulador.
 * Al estimular, el músculo "vibra" unos frames y salta una chispa en el electrodo.
 */
export function Apparatus({ length, shortening = 0, stimulusId, isotonic }: ApparatusProps): ReactNode {
  const { t } = useTranslation('muscle')
  const [pulse, setPulse] = useState(0)

  useEffect(() => {
    if (stimulusId === 0) return
    // 6 frames a 20 fps alternando el ancho (sparkCount < 6 en el original)
    let frame = 0
    setPulse(1)
    const id = window.setInterval(() => {
      frame++
      setPulse(frame < 6 ? (frame % 2 === 0 ? 1 : 2) : 0)
      if (frame >= 6) window.clearInterval(id)
    }, 50)
    return () => window.clearInterval(id)
  }, [stimulusId])

  const L = length - shortening
  const h = bellyHeight(L)
  const w = bellyWidth(L) - (pulse === 1 ? 5 : 0)
  const cx = 130
  const bottom = TOP + 10 + h
  const spark = pulse !== 0

  const onDrop = (e: DragEvent): void => {
    e.preventDefault()
    const w = Number(e.dataTransfer.getData('text/weight'))
    if (isotonic && w) isotonic.onDropWeight(w)
  }

  // altura de la plataforma: el músculo descansa sobre ella a la longitud indicada
  const platformY = isotonic ? TOP + 10 + bellyHeight(isotonic.platform) + 46 : 0

  return (
    <div
      className="relative"
      onDragOver={(e) => isotonic && !isotonic.locked && e.preventDefault()}
      onDrop={onDrop}
    >
      <svg viewBox="0 0 220 470" className="mx-auto h-full max-h-[440px] w-full">
        <defs>
          <linearGradient id="metal" x1="0" x2="1">
            <stop offset="0" stopColor="#6b7280" />
            <stop offset="0.45" stopColor="#f3f4f6" />
            <stop offset="1" stopColor="#4b5563" />
          </linearGradient>
          <radialGradient id="muscle" cx="0.35" cy="0.4" r="0.8">
            <stop offset="0" stopColor="#fecaca" />
            <stop offset="0.35" stopColor="#ef4444" />
            <stop offset="1" stopColor="#991b1b" />
          </radialGradient>
        </defs>

        {/* soporte vertical */}
        <rect x={22} y={14} width={14} height={450} rx={4} fill="url(#metal)" />
        {/* brazo superior + transductor */}
        <rect x={22} y={34} width={150} height={10} rx={3} fill="url(#metal)" />
        <rect x={112} y={26} width={36} height={26} rx={4} fill="url(#metal)" stroke="#374151" />
        <line x1={cx} y1={52} x2={cx} y2={TOP} stroke="#d1d5db" strokeWidth={2} />

        {/* músculo */}
        <path
          d={`M ${cx} ${TOP}
              C ${cx + w * 0.9} ${TOP + h * 0.15}, ${cx + w * 0.75} ${TOP + h * 0.9}, ${cx} ${TOP + 10 + h}
              C ${cx - w * 0.75} ${TOP + h * 0.9}, ${cx - w * 0.9} ${TOP + h * 0.15}, ${cx} ${TOP} Z`}
          fill="url(#muscle)"
          stroke="#7f1d1d"
          strokeWidth={1}
          style={{ transition: 'all 40ms linear' }}
        />
        {Array.from({ length: 5 }, (_, i) => (
          <path
            key={i}
            d={`M ${cx} ${TOP + 6} Q ${cx + (i - 2) * w * 0.28} ${TOP + h / 2} ${cx} ${bottom - 4}`}
            fill="none"
            stroke="#fee2e2"
            strokeOpacity={0.35}
          />
        ))}

        {/* electrodo */}
        <path
          d={`M 200 ${TOP + 60} V 300 H 214`}
          fill="none"
          stroke="url(#metal)"
          strokeWidth={6}
        />
        <rect x={180} y={TOP + 50} width={22} height={20} rx={3} fill="url(#metal)" stroke="#374151" />
        <line x1={cx + w * 0.45} y1={TOP + 56} x2={182} y2={TOP + 56} stroke="#111" strokeWidth={1.5} />
        <line x1={cx + w * 0.45} y1={TOP + 64} x2={182} y2={TOP + 64} stroke="#111" strokeWidth={1.5} />
        {spark && (
          <path
            d={`M ${cx + 6} ${TOP + 52} l 8 6 l -6 2 l 10 8`}
            fill="none"
            stroke="#fde047"
            strokeWidth={2.5}
          />
        )}

        {isotonic ? (
          <>
            {/* gancho inferior */}
            <line x1={cx} y1={bottom} x2={cx} y2={bottom + 14} stroke="#d1d5db" strokeWidth={2} />
            {isotonic.weight > 0 ? (
              <g
                onClick={() => !isotonic.locked && isotonic.onRemoveWeight()}
                className={isotonic.locked ? '' : 'cursor-pointer'}
              >
                <title>{t('hints.dragWeight')}</title>
                <Weight x={cx} y={bottom + 14} weight={isotonic.weight} />
              </g>
            ) : (
              <circle cx={cx} cy={bottom + 18} r={5} fill="none" stroke="#d1d5db" strokeWidth={2} />
            )}
            {/* plataforma */}
            <rect x={70} y={platformY} width={120} height={10} rx={2} fill="url(#metal)" stroke="#374151" />
            <rect x={36} y={platformY + 3} width={40} height={5} fill="url(#metal)" />
          </>
        ) : (
          <>
            {/* pinza inferior fija (contracción isométrica) */}
            <line x1={cx} y1={bottom} x2={cx} y2={bottom + 20} stroke="#d1d5db" strokeWidth={2} />
            <rect x={110} y={bottom + 18} width={40} height={16} rx={4} fill="url(#metal)" stroke="#374151" />
            <rect x={22} y={bottom + 22} width={90} height={8} rx={2} fill="url(#metal)" />
          </>
        )}
      </svg>
    </div>
  )
}

/** Pesa dibujada en SVG; el tamaño crece con la masa */
function Weight({ x, y, weight }: { x: number; y: number; weight: number }): ReactNode {
  const r = 10 + weight * 5
  return (
    <g>
      <line x1={x} y1={y} x2={x} y2={y + 8} stroke="#d1d5db" strokeWidth={2} />
      <rect x={x - r} y={y + 8} width={r * 2} height={20 + weight * 6} rx={4} fill="#9ca3af" stroke="#374151" />
      <text x={x} y={y + 24 + weight * 3} textAnchor="middle" fontSize={11} fontWeight={700} fill="#111827">
        {weight.toFixed(1)}g
      </text>
    </g>
  )
}

/** Bandeja de pesas arrastrables (contracción isotónica) */
export function WeightTray({
  weights,
  current,
  onPick,
  locked
}: {
  weights: readonly number[]
  current: number
  onPick: (w: number) => void
  locked: boolean
}): ReactNode {
  const { t } = useTranslation('muscle')
  return (
    <div
      className="flex items-end justify-center gap-2"
      title={t('hints.dragWeight')}
      onDragOver={(e) => e.preventDefault()}
    >
      {weights.map((w) => {
        const inUse = w === current
        return (
          <button
            key={w}
            type="button"
            draggable={!locked && !inUse}
            disabled={locked || inUse}
            onDragStart={(e) => e.dataTransfer.setData('text/weight', String(w))}
            onClick={() => onPick(w)}
            className="flex flex-col items-center rounded border border-bench-900 bg-gray-400 px-2 pt-1 pb-0.5 text-xs font-bold text-gray-900 shadow hover:bg-gray-300 disabled:opacity-25"
            style={{ height: 34 + w * 10, width: 36 + w * 6 }}
          >
            <span className="mt-auto">{w.toFixed(1)}g</span>
          </button>
        )
      })}
    </div>
  )
}
