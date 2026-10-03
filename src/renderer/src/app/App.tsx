import { Suspense, type ReactNode } from 'react'
import { HashRouter, Link, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { labs } from '@/modules/registry'
import { LANGUAGES } from '@/shared/i18n'
import { UpdateNotice } from './UpdateNotice'

export function App(): ReactNode {
  return (
    <HashRouter>
      <div className="no-print flex h-full flex-col">
        <TopBar />
        <main className="min-h-0 flex-1 overflow-auto">
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/lab/:labId/*" element={<LabRoute />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </HashRouter>
  )
}

function TopBar(): ReactNode {
  const { t, i18n } = useTranslation()
  return (
    <header className="flex items-center gap-4 border-b border-black/40 bg-bench-800 px-4 py-1 shadow">
      <Link to="/" className="text-lg font-bold tracking-wide text-white hover:text-sky-300">
        {t('app.title')}
      </Link>
      <Link to="/" className="text-sm text-bench-100 hover:text-white">
        {t('app.home')}
      </Link>
      <div className="ml-auto flex items-center gap-2 text-sm">
        <UpdateNotice />
        <span className="text-bench-300">{t('app.language')}</span>
        {LANGUAGES.map((lng) => (
          <button
            key={lng}
            type="button"
            onClick={() => i18n.changeLanguage(lng)}
            className={`rounded px-2 py-0.5 font-semibold uppercase ${i18n.language === lng ? 'bg-sky-500 text-white' : 'text-bench-100 hover:bg-bench-600'}`}
          >
            {lng}
          </button>
        ))}
      </div>
    </header>
  )
}

function Home(): ReactNode {
  const { t } = useTranslation()
  return (
    <div className="mx-auto max-w-5xl p-8">
      <h1 className="text-3xl font-bold">{t('app.title')}</h1>
      <p className="mb-8 text-bench-300">{t('app.subtitle')}</p>
      <h2 className="mb-3 font-semibold text-bench-100">{t('app.selectLab')}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {labs.map((lab) => {
          const enabled = Boolean(lab.component)
          const body = (
            <>
              <span className="text-3xl">{lab.icon}</span>
              <span className="flex-1">
                <span className="block text-xs text-bench-300">#{lab.number}</span>
                <span className="block font-semibold">{t(lab.titleKey)}</span>
                {!enabled && <span className="text-xs text-bench-300">{t('app.comingSoon')}</span>}
              </span>
            </>
          )
          const cls =
            'flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ' +
            (enabled
              ? 'border-sky-400/60 bg-bench-700 hover:bg-bench-600'
              : 'cursor-not-allowed border-bench-600 bg-bench-800 opacity-50')
          return enabled ? (
            <Link key={lab.id} to={`/lab/${lab.id}`} className={cls}>
              {body}
            </Link>
          ) : (
            <div key={lab.id} className={cls} aria-disabled>
              {body}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function LabRoute(): ReactNode {
  const { labId } = useParams()
  const lab = labs.find((l) => l.id === labId)
  if (!lab?.component) return <Navigate to="/" replace />
  const Component = lab.component
  return <Component />
}
