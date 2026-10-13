import { useState, type CSSProperties, type ReactNode } from 'react'
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
      className={`px-well p-3 ${over ? '!border-[color:var(--accent)]' : ''} ${onClick ? 'cursor-pointer' : ''}`}
    >
      <svg viewBox="0 0 140 260" className="mx-auto block h-56 w-full" role="img" aria-label={title}>
        <rect className="il-glass" x={30} y={5} width={80} height={250} rx={8} />
        {nerveColor && (
          <>
            <path
              d="M 72 15 C 66 70, 76 120, 69 170 S 72 230, 70 248"
              fill="none"
              style={{ stroke: nerveColor }}
              strokeWidth={8}
              strokeLinecap="round"
            />
            {residue && <circle cx={70} cy={130} r={14} style={{ fill: residue }} fillOpacity={0.45} />}
          </>
        )}
        {/* electrodos de registro (arriba) y de estímulo (abajo) */}
        <line className="il-electrode" x1={22} x2={118} y1={60} y2={60} />
        <line className="il-electrode" x1={22} x2={118} y1={95} y2={95} />
        <text className="il-label" x={124} y={82}>R</text>
        <line className="il-thin" x1={22} x2={118} y1={185} y2={185} />
        <line className="il-electrode" x1={22} x2={118} y1={220} y2={220} style={{ stroke: 'var(--accent)' }} />
        <text className="il-label" x={124} y={207}>E</text>
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
      className="px-reagent w-full disabled:cursor-not-allowed disabled:opacity-45"
      style={{ '--c': color } as CSSProperties}
    >
      <svg viewBox="0 0 14 24" aria-hidden="true" className={dripping ? 'animate-bounce' : ''}>
        <path className="vessel" d="M4 1h6v5l2.5 4v11.5a1.5 1.5 0 0 1-1.5 1.5H3a1.5 1.5 0 0 1-1.5-1.5V10L4 6z" />
        <path className="fill" d="M2.5 13h9v8.5a.5.5 0 0 1-.5.5H3a.5.5 0 0 1-.5-.5z" />
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
    <div className="flex items-center gap-3">
      <Light on={on} label="" />
      <Button className="flex-1" {...props}>
        {children}
      </Button>
    </div>
  )
}

/** colores de cada nervio en la bandeja del experimento de velocidad de conducción */
export const NERVE_COLORS = {
  worm: 'var(--signal)',
  frog: 'var(--scale-3)',
  rat1: 'var(--chart-3)',
  rat2: 'var(--chart-4)'
} as const

export const DEFAULT_NERVE = 'var(--chart-4)'
