import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, NavLink, Route, Routes } from 'react-router-dom'
import { labs } from '@/modules/registry'
import { ToolbarHost } from './ToolbarSlot'

export interface LabExperiment {
  path: string
  label: string
  element: ReactNode
}

/**
 * Encabezado de un laboratorio (`.px-labhead`: rótulo, título y herramientas a la derecha), las
 * pestañas numeradas de sus actividades y las rutas de cada una.
 */
export function LabShell({
  title,
  base,
  experiments
}: {
  title: string
  /** ruta absoluta del laboratorio, p. ej. `/lab/muscle` */
  base: string
  experiments: LabExperiment[]
}): ReactNode {
  const { t } = useTranslation()
  const lab = labs.find((l) => `/lab/${l.id}` === base)
  // Rutas absolutas: en React Router v7 los enlaces relativos dentro de una ruta con comodín
  // (/lab/:labId/*) se resuelven contra la URL completa y provocaban un bucle de redirecciones.
  return (
    <div className="px-container">
      <ToolbarHost
        renderTarget={(ref) => (
          <>
            <div className="px-labhead">
              <div>
                {lab && (
                  <div className="px-eyebrow">
                    {t('app.labEyebrow', { number: labNumber(lab.number), system: t(`systems.${lab.id}`) })}
                  </div>
                )}
                <h1>{title}</h1>
              </div>
              <div ref={ref} className="px-labhead__actions" />
            </div>
            <nav className="px-tabs" aria-label={title}>
              {experiments.map((e, i) => (
                <NavLink key={e.path} to={`${base}/${e.path}`} className="px-tab">
                  <span className="n">{labNumber(i + 1)}</span>
                  {e.label}
                </NavLink>
              ))}
            </nav>
          </>
        )}
      >
        <div className="px-labbody">
          <Routes>
            {experiments.map((e) => (
              <Route key={e.path} path={e.path} element={e.element} />
            ))}
            <Route path="*" element={<Navigate to={`${base}/${experiments[0].path}`} replace />} />
          </Routes>
        </div>
      </ToolbarHost>
    </div>
  )
}

/** Número con dos cifras («02») */
export function labNumber(n: number): string {
  return String(n).padStart(2, '0')
}
