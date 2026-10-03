import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-sky-500 text-white hover:bg-sky-400 active:bg-sky-600',
  secondary: 'bg-bench-100 text-bench-900 hover:bg-white active:bg-bench-300',
  danger: 'bg-rose-500 text-white hover:bg-rose-400 active:bg-rose-600',
  ghost: 'bg-transparent text-bench-100 hover:bg-bench-600'
}

export function Button({
  variant = 'secondary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }): ReactNode {
  return (
    <button
      type="button"
      className={`rounded-md px-3 py-1.5 text-sm font-semibold shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  )
}

export function Panel({
  title,
  className = '',
  children
}: {
  title?: ReactNode
  className?: string
  children: ReactNode
}): ReactNode {
  return (
    <section
      className={`rounded-xl border border-bench-500/60 bg-bench-700 p-3 shadow-lg shadow-black/30 ${className}`}
    >
      {title && <h3 className="mb-2 text-center text-sm font-semibold text-bench-100">{title}</h3>}
      {children}
    </section>
  )
}

/** Pantalla tipo LCD para mostrar valores numéricos */
export function Readout({
  value,
  className = '',
  dim = false
}: {
  value: string
  className?: string
  dim?: boolean
}): ReactNode {
  return (
    <div
      className={`min-w-20 rounded border border-black bg-black px-2 py-1 text-right font-mono text-lg leading-tight tabular-nums ${dim ? 'text-lcd/40' : 'text-lcd'} ${className}`}
    >
      {value || ' '}
    </div>
  )
}

/** Indicador luminoso (encendido mientras se estimula) */
export function Light({ on }: { on: boolean }): ReactNode {
  return (
    <span
      className={`inline-block size-3.5 rounded-full border border-black/50 ${on ? 'bg-lime-400 shadow-[0_0_8px_2px] shadow-lime-400/70' : 'bg-emerald-950'}`}
    />
  )
}

export function Modal({
  title,
  onClose,
  children,
  wide = false
}: {
  title: ReactNode
  onClose: () => void
  children: ReactNode
  wide?: boolean
}): ReactNode {
  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`w-full ${wide ? 'max-w-4xl' : 'max-w-md'} rounded-xl border border-bench-500 bg-bench-800 p-5 shadow-2xl`}
      >
        <h2 className="mb-4 text-lg font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  )
}
