import type { ReactNode } from 'react'

/** Rata vista de costado */
export function RatFigure({ small = false }: { small?: boolean }): ReactNode {
  const body = (
    <g>
      <ellipse cx={45} cy={30} rx={32} ry={18} fill="#f3f4f6" stroke="#9ca3af" />
      <ellipse cx={80} cy={24} rx={14} ry={10} fill="#f3f4f6" stroke="#9ca3af" />
      <circle cx={86} cy={21} r={2} fill="#111827" />
      <ellipse cx={74} cy={14} rx={5} ry={4} fill="#fecaca" />
      <path d="M 13 32 Q -5 40 2 52" fill="none" stroke="#fda4af" strokeWidth={2} />
      <rect x={38} y={14} width={10} height={32} rx={3} fill="#fde047" fillOpacity={0.7} />
    </g>
  )
  return small ? (
    <svg viewBox="0 0 100 60" className="h-8 w-14">
      {body}
    </svg>
  ) : (
    body
  )
}

/** Jeringa con una etiqueta; resaltada cuando está elegida */
export function Syringe({
  label,
  selected,
  disabled,
  onClick,
  fill = '#7dd3fc'
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
      className={`flex items-center gap-2 rounded-lg border p-2 text-left text-sm font-semibold disabled:opacity-40 ${selected ? 'border-sky-400 bg-bench-800' : 'border-bench-500 bg-bench-900 hover:bg-bench-800'}`}
    >
      <svg viewBox="0 0 20 70" className="h-12 w-4 shrink-0">
        <rect x={8} y={0} width={4} height={14} fill="#9ca3af" />
        <rect x={3} y={14} width={14} height={40} rx={2} fill="#e5e7eb" />
        <rect x={5} y={30} width={10} height={22} fill={fill} />
        <rect x={9} y={54} width={2} height={14} fill="#6b7280" />
      </svg>
      <span>{label}</span>
    </button>
  )
}

export { DropperBottle, TestTube } from '@/shared/components/LabGlass'
