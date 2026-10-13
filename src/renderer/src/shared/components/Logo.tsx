import type { ReactNode } from 'react'

/**
 * Isotipo de PhysioEx (trazo sobre grilla), copiado de `logo/physioex-trazo*.svg`. Es la marca:
 * conserva sus colores propios en los dos temas. `detailed` usa la versión con grilla (tamaños
 * grandes); la simple se lee mejor a 16–32 px.
 */
export function LogoMark({ size = 24, detailed = false, className = '' }: { size?: number; detailed?: boolean; className?: string }): ReactNode {
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} className={className} aria-hidden="true">
      <rect x="6" y="6" width="500" height="500" rx="108" fill="#0d1218" stroke="#2f3d4e" strokeWidth="12" />
      {detailed ? (
        <>
          <path d="M176 96V416M336 96V416M80 176H432M80 336H432" stroke="#1f2a36" strokeWidth="8" />
          <path
            d="M84 316H176L236 120L292 380L332 316H428"
            fill="none"
            stroke="#4cc3b5"
            strokeWidth="40"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="96" cy="316" r="30" fill="#f0b44c" />
        </>
      ) : (
        <>
          <path
            d="M80 316H170L236 104L296 396L338 316H432"
            fill="none"
            stroke="#4cc3b5"
            strokeWidth="60"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="96" cy="316" r="44" fill="#f0b44c" />
        </>
      )}
    </svg>
  )
}
