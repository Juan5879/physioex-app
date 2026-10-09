import type { ReactNode } from 'react'

/** Gotero (frasco) elegible */
export function DropperBottle({
  label,
  selected,
  disabled,
  onClick,
  color = '#93c5fd'
}: {
  label: string
  selected?: boolean
  disabled?: boolean
  onClick: () => void
  color?: string
}): ReactNode {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-1 rounded-lg border p-1.5 text-xs font-semibold disabled:opacity-40 ${selected ? 'border-sky-400 bg-bench-800' : 'border-bench-500 bg-bench-900 hover:bg-bench-800'}`}
    >
      <svg viewBox="0 0 30 50" className="h-10 w-6">
        <rect x={11} y={2} width={8} height={10} rx={3} fill="#111827" />
        <path d="M 5 18 Q 5 14 9 14 H 21 Q 25 14 25 18 V 44 Q 25 48 21 48 H 9 Q 5 48 5 44 Z" fill="#dbeafe" />
        <rect x={7} y={28} width={16} height={18} rx={3} fill={color} />
      </svg>
      <span className="text-center leading-tight">{label}</span>
    </button>
  )
}

/** Tubo de ensayo: `level` 0–1, color del contenido y sedimento */
export function TestTube({
  number,
  placed,
  level,
  color,
  pellet,
  shaking,
  selected,
  disabled,
  onClick,
  title
}: {
  number: number
  placed: boolean
  level: number
  color: string
  pellet?: boolean
  shaking?: boolean
  selected?: boolean
  disabled?: boolean
  onClick?: () => void
  title?: string
}): ReactNode {
  const h = 70 * Math.max(0, Math.min(1, level))
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex flex-col items-center gap-0.5 rounded-md p-1 disabled:cursor-default ${selected ? 'bg-sky-900/60 ring-1 ring-sky-400' : onClick && !disabled ? 'hover:bg-bench-800' : ''}`}
    >
      <svg viewBox="0 0 24 90" className={`h-20 w-6 ${shaking ? 'animate-bounce' : ''}`}>
        {placed ? (
          <>
            <path d="M 3 2 V 78 Q 3 88 12 88 Q 21 88 21 78 V 2" fill="#e0f2fe" fillOpacity={0.15} stroke="#cbd5e1" strokeWidth={1.5} />
            {h > 0 && <path d={`M 4.5 ${86 - h} V 78 Q 4.5 86.5 12 86.5 Q 19.5 86.5 19.5 78 V ${86 - h} Z`} fill={color} />}
            {pellet && <ellipse cx={12} cy={83} rx={6} ry={3} fill="#78350f" />}
          </>
        ) : (
          <path d="M 3 2 V 78 Q 3 88 12 88 Q 21 88 21 78 V 2" fill="none" stroke="#475569" strokeDasharray="3 3" />
        )}
      </svg>
      <span className="font-mono text-xs text-bench-100">{number}</span>
    </button>
  )
}
