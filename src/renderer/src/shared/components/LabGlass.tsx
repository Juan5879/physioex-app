import type { CSSProperties, ReactNode } from 'react'

/** Gotero (frasco) elegible, como reactivo del estante (`.px-reagent`) */
export function DropperBottle({
  label,
  selected,
  disabled,
  onClick,
  color = 'var(--scale-3)'
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
      aria-pressed={Boolean(selected)}
      className="px-reagent !flex-col !justify-center !gap-1.5 !px-1.5 !py-2.5 text-center !text-xs disabled:cursor-not-allowed disabled:opacity-45"
      style={{ '--c': color } as CSSProperties}
    >
      <svg viewBox="0 0 14 24" aria-hidden="true">
        <path className="vessel" d="M4 1h6v5l2.5 4v11.5a1.5 1.5 0 0 1-1.5 1.5H3a1.5 1.5 0 0 1-1.5-1.5V10L4 6z" />
        <path className="fill" d="M2.5 13h9v8.5a.5.5 0 0 1-.5.5H3a.5.5 0 0 1-.5-.5z" />
      </svg>
      <span className="leading-tight">{label}</span>
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
      aria-pressed={selected}
      className={`flex flex-col items-center gap-1 rounded-[var(--radius-md)] border p-1 disabled:cursor-default ${
        selected
          ? 'border-[color:var(--accent)] bg-[color:var(--accent-soft)]'
          : `border-transparent ${onClick && !disabled ? 'hover:bg-[color:var(--surface-raised)]' : ''}`
      }`}
    >
      <svg viewBox="0 0 24 90" className={`h-20 w-6 ${shaking ? 'animate-bounce' : ''}`}>
        {placed ? (
          <>
            <path className="il-glass" d="M 3 2 V 78 Q 3 88 12 88 Q 21 88 21 78 V 2" strokeWidth={1.5} />
            {h > 0 && (
              <path d={`M 4.5 ${86 - h} V 78 Q 4.5 86.5 12 86.5 Q 19.5 86.5 19.5 78 V ${86 - h} Z`} style={{ fill: color }} />
            )}
            {pellet && <ellipse cx={12} cy={83} rx={6} ry={3} style={{ fill: 'var(--ink-subtle)' }} />}
          </>
        ) : (
          <path className="il-thin" d="M 3 2 V 78 Q 3 88 12 88 Q 21 88 21 78 V 2" strokeDasharray="3 3" />
        )}
      </svg>
      <span className="font-mono text-[11px] text-[color:var(--ink-subtle)]">{number}</span>
    </button>
  )
}
