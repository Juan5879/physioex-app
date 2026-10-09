import type { ReactNode } from 'react'
import { Navigate, NavLink, Route, Routes } from 'react-router-dom'
import { ToolbarHost } from './ToolbarSlot'

export interface LabExperiment {
  path: string
  label: string
  element: ReactNode
}

/**
 * Encabezado de un laboratorio con las pestañas de sus experimentos y el lugar del menú
 * de herramientas, más las rutas de cada experimento.
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
  // Rutas absolutas: en React Router v7 los enlaces relativos dentro de una ruta con comodín
  // (/lab/:labId/*) se resuelven contra la URL completa y provocaban un bucle de redirecciones.
  return (
    <div className="mx-auto max-w-[1500px]">
      <ToolbarHost
        renderTarget={(ref) => (
          <div className="flex flex-wrap items-end gap-x-4 border-b border-bench-600 px-3 pt-1.5">
            <h1 className="pb-1.5 text-lg font-bold">{title}</h1>
            <nav className="flex flex-wrap gap-1">
              {experiments.map((e, i) => (
                <NavLink
                  key={e.path}
                  to={`${base}/${e.path}`}
                  className={({ isActive }) =>
                    `rounded-t-lg px-3 py-1.5 text-sm font-semibold ${isActive ? 'bg-bench-700 text-white' : 'text-bench-300 hover:bg-bench-800 hover:text-white'}`
                  }
                >
                  {i + 1}. {e.label}
                </NavLink>
              ))}
            </nav>
            <div ref={ref} className="ml-auto pb-1" />
          </div>
        )}
      >
        <Routes>
          {experiments.map((e) => (
            <Route key={e.path} path={e.path} element={e.element} />
          ))}
          <Route path="*" element={<Navigate to={`${base}/${experiments[0].path}`} replace />} />
        </Routes>
      </ToolbarHost>
    </div>
  )
}
