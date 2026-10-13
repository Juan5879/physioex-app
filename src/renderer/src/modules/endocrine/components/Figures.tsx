import type { CSSProperties, ReactNode } from 'react'

/** Rata vista de costado (ilustración plana) */
export function RatFigure({ small = false }: { small?: boolean }): ReactNode {
  const body = (
    <g>
      <path className="il-thin" d="M 13 32 Q -5 40 2 52" />
      <ellipse className="il-glass" cx={45} cy={30} rx={32} ry={18} />
      <ellipse className="il-glass" cx={80} cy={24} rx={14} ry={10} />
      <circle cx={86} cy={21} r={2} style={{ fill: 'var(--ink)' }} />
      <ellipse className="il-tissue" cx={74} cy={14} rx={5} ry={4} />
    </g>
  )
  return small ? (
    <svg viewBox="0 0 100 60" className="h-8 w-14" aria-hidden="true">
      {body}
    </svg>
  ) : (
    body
  )
}

/** Jeringa elegible (`.px-reagent` con glifo de jeringa); resaltada cuando está elegida */
export function Syringe({
  label,
  selected,
  disabled,
  onClick,
  fill = 'var(--scale-3)'
}: {
  label: string
  selected?: boolean
  disabled?: boolean
  onClick: () => void
  fill?: string
}): ReactNode {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={Boolean(selected)}
      className="px-reagent disabled:cursor-not-allowed disabled:opacity-45"
      style={{ '--c': fill } as CSSProperties}
    >
      <svg viewBox="0 0 14 24" aria-hidden="true">
        <path className="vessel" d="M5 1h4M7 1v4M3.5 5h7v15h-7zM7 20v3.5" />
        <rect className="fill" x={4.5} y={11} width={5} height={8} />
      </svg>
      <span>{label}</span>
    </button>
  )
}

export { DropperBottle, TestTube } from '@/shared/components/LabGlass'
