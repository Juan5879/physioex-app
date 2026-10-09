import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Oscilloscope, type ScopeSeries } from '@/shared/components/Oscilloscope'
import { Button, Light } from '@/shared/components/ui'

/** Rango vertical del monitor: el original dibujaba y = −79.5 − 1.5·v en una pantalla de 192 px */
export const SCOPE_Y = { min: -60, max: 68 }
const X_TICKS = Array.from({ length: 11 }, (_, i) => i)

/** Monitor del osciloscopio: 10 divisiones; la escala de tiempo sólo cambia el rótulo */
export function NerveScope({
  series,
  xLabel,
  measureX,
  light
}: {
  series: ScopeSeries[]
  xLabel: string
  measureX?: number | null
  light?: boolean
}): ReactNode {
  const { t } = useTranslation('nerve')
  return (
    <Oscilloscope
      xMax={10}
      yMin={SCOPE_Y.min}
      yMax={SCOPE_Y.max}
      xTicks={X_TICKS}
      yTicks={[0]}
      xLabel={xLabel}
      yLabel={t('fields.amplitude')}
      series={series}
      measureX={measureX}
      light={light}
    />
  )
}

export const DRAG_TYPE = 'text/nerve-item'

/**
 * Cámara del nervio con los electrodos de estímulo (abajo) y de registro (arriba).
 * Acepta reactivos o nervios arrastrados.
 */
export function NerveChamber({
  nerveColor,
  residue,
  onDrop,
  onClick,
  title
}: {
  /** color del nervio colocado; `null` = cámara vacía */
  nerveColor: string | null
  /** color de la gota aplicada que queda en el nervio hasta limpiarlo */
  residue?: string | null
  onDrop?: (item: string) => void
  onClick?: () => void
  title?: string
}): ReactNode {
  const [over, setOver] = useState(false)
  return (
    <div
      onDragOver={(e) => {
        if (!onDrop) return
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        const item = e.dataTransfer.getData(DRAG_TYPE)
        if (item && onDrop) onDrop(item)
      }}
      onClick={onClick}
      title={title}
      className={`rounded-xl border-4 bg-bench-800 p-2 ${over ? 'border-sky-400' : 'border-bench-600'} ${onClick ? 'cursor-pointer' : ''}`}
    >
      <svg viewBox="0 0 100 260" className="mx-auto h-64 w-full">
        <rect x={10} y={5} width={80} height={250} rx={4} fill="#1f2937" stroke="#4b5563" />
        {[60, 95, 185, 220].map((y) => (
          <line key={y} x1={10} x2={90} y1={y} y2={y} stroke="#6b7280" strokeWidth={1} />
        ))}
        {nerveColor && (
          <>
            <path
              d="M 52 15 C 46 70, 56 120, 49 170 S 52 230, 50 248"
              fill="none"
              stroke={nerveColor}
              strokeWidth={9}
              strokeLinecap="round"
            />
            {residue && <circle cx={50} cy={130} r={14} fill={residue} fillOpacity={0.45} />}
          </>
        )}
        {/* electrodos de registro (arriba) y de estímulo (abajo) */}
        <line x1={20} x2={100} y1={60} y2={60} stroke="#ef4444" strokeWidth={2} />
        <line x1={20} x2={100} y1={95} y2={95} stroke="#ef4444" strokeWidth={2} />
        <line x1={0} x2={80} y1={185} y2={185} stroke="#111827" strokeWidth={2.5} />
        <line x1={0} x2={80} y1={220} y2={220} stroke="#ef4444" strokeWidth={2} />
      </svg>
    </div>
  )
}

/** Gotero o reactivo arrastrable; un clic también lo aplica */
export function Dropper({
  label,
  color,
  item,
  onApply,
  disabled,
  dripping
}: {
  label: string
  color: string
  item: string
  onApply: () => void
  disabled?: boolean
  dripping?: boolean
}): ReactNode {
  const { t } = useTranslation('nerve')
  return (
    <button
      type="button"
      draggable={!disabled}
      disabled={disabled}
      onDragStart={(e) => e.dataTransfer.setData(DRAG_TYPE, item)}
      onClick={onApply}
      title={t('hints.drag')}
      className="flex w-full items-center gap-3 rounded-lg border border-bench-500 bg-bench-900 p-2 text-left text-sm font-semibold hover:bg-bench-800 disabled:opacity-40"
    >
      <svg viewBox="0 0 30 60" className={`h-12 w-6 shrink-0 ${dripping ? 'animate-bounce' : ''}`}>
        <rect x={11} y={2} width={8} height={12} rx={3} fill="#111827" />
        <rect x={13} y={14} width={4} height={8} fill="#d1d5db" />
        <path d="M 5 26 Q 5 22 9 22 H 21 Q 25 22 25 26 V 54 Q 25 58 21 58 H 9 Q 5 58 5 54 Z" fill="#dbeafe" />
        <rect x={7} y={36} width={16} height={20} rx={3} fill={color} />
      </svg>
      <span>{label}</span>
    </button>
  )
}

/** Botón con luz indicadora, como los del estimulador original */
export function LitButton({
  on,
  children,
  ...props
}: Parameters<typeof Button>[0] & { on: boolean }): ReactNode {
  return (
    <div className="flex items-center gap-2">
      <Light on={on} />
      <Button {...props}>{children}</Button>
    </div>
  )
}

/** colores de cada nervio en la bandeja del experimento de velocidad de conducción */
export const NERVE_COLORS = {
  worm: '#c2a27a',
  frog: '#a3e635',
  rat1: '#f5d0d0',
  rat2: '#f9a8b8'
} as const

export const DEFAULT_NERVE = '#fbcfe8'
