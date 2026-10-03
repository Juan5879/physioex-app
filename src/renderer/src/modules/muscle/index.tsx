import type { ReactNode } from 'react'
import { Navigate, NavLink, Route, Routes } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ToolbarHost } from '@/shared/components/ToolbarSlot'
import { SingleStimulus } from './experiments/SingleStimulus'
import { MultipleStimulus } from './experiments/MultipleStimulus'
import { Isometric } from './experiments/Isometric'
import { Isotonic } from './experiments/Isotonic'

const EXPERIMENTS = [
  { path: 'single', key: 'experiments.single', element: <SingleStimulus /> },
  { path: 'multiple', key: 'experiments.multiple', element: <MultipleStimulus /> },
  { path: 'isometric', key: 'experiments.isometric', element: <Isometric /> },
  { path: 'isotonic', key: 'experiments.isotonic', element: <Isotonic /> }
] as const

/** Ejercicio 2 de PhysioEx: Fisiología del músculo esquelético */
export default function MuscleLab(): ReactNode {
  const { t } = useTranslation('muscle')
  return (
    <div className="mx-auto max-w-[1500px]">
      <ToolbarHost
        renderTarget={(ref) => (
          <div className="flex flex-wrap items-end gap-x-4 border-b border-bench-600 px-3 pt-1.5">
            <h1 className="pb-1.5 text-lg font-bold">{t('title')}</h1>
            <nav className="flex gap-1">
              {EXPERIMENTS.map((e, i) => (
                <NavLink
                  key={e.path}
                  to={e.path}
                  className={({ isActive }) =>
                    `rounded-t-lg px-3 py-1.5 text-sm font-semibold ${isActive ? 'bg-bench-700 text-white' : 'text-bench-300 hover:bg-bench-800 hover:text-white'}`
                  }
                >
                  {i + 1}. {t(e.key)}
                </NavLink>
              ))}
            </nav>
            <div ref={ref} className="ml-auto pb-1" />
          </div>
        )}
      >
        <Routes>
          {EXPERIMENTS.map((e) => (
            <Route key={e.path} path={e.path} element={e.element} />
          ))}
          <Route path="*" element={<Navigate to="single" replace />} />
        </Routes>
      </ToolbarHost>
    </div>
  )
}
