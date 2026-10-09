import { Suspense, type ReactNode } from "react";
import {
  HashRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useParams,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import { labs } from "@/modules/registry";
import { LANGUAGES } from "@/shared/i18n";
import { UpdateNotice } from "./UpdateNotice";
import { ErrorBoundary } from "./ErrorBoundary";

export function App(): ReactNode {
  return (
    <HashRouter>
      <div className="no-print flex h-full flex-col">
        <TopBar />
        <main className="min-h-0 flex-1 overflow-auto">
          <ErrorBoundary>
            <Suspense fallback={null}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/lab/:labId/*" element={<LabRoute />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </HashRouter>
  );
}

function TopBar(): ReactNode {
  const { t, i18n } = useTranslation();
  return (
    <header className="flex items-center gap-4 border-b border-black/40 bg-bench-800 px-4 py-1 shadow">
      <Link
        to="/"
        className="text-lg font-bold tracking-wide text-white hover:text-sky-300"
      >
        {t("app.title")}
      </Link>
      <Link to="/" className="text-sm text-bench-100 hover:text-white">
        {t("app.home")}
      </Link>
      <Link
        to="/lab/histology"
        className="text-sm text-bench-100 hover:text-white"
      >
        🔬 {t("labs.histology")}
      </Link>
      <div className="ml-auto flex items-center gap-2 text-sm">
        <UpdateNotice />
        <span className="text-bench-300">{t("app.language")}</span>
        {LANGUAGES.map((lng) => (
          <button
            key={lng}
            type="button"
            onClick={() => i18n.changeLanguage(lng)}
            className={`rounded px-2 py-0.5 font-semibold uppercase ${i18n.language === lng ? "bg-sky-500 text-white" : "text-bench-100 hover:bg-bench-600"}`}
          >
            {lng}
          </button>
        ))}
      </div>
    </header>
  );
}

function Home(): ReactNode {
  const { t } = useTranslation();
  const references = labs.filter((l) => l.reference);
  return (
    <div className="mx-auto max-w-5xl p-8">
      <h1 className="text-3xl font-bold">{t("app.title")}</h1>
      <p className="mb-8 text-bench-300">{t("app.subtitle")}</p>
      <h2 className="mb-3 font-semibold text-bench-100">
        {t("app.selectLab")}
      </h2>
      <LabGrid />
      {references.length > 0 && (
        <>
          <h2 className="mt-10 mb-1 font-semibold text-bench-100">
            {t("app.reference")}
          </h2>
          <p className="mb-3 text-sm text-bench-300">
            {t("app.referenceHint")}
          </p>
          {references.map((lab) => (
            <Link
              key={lab.id}
              to={`/lab/${lab.id}`}
              className="flex items-center gap-4 overflow-hidden rounded-xl border border-emerald-400/60 bg-bench-700 transition-colors hover:bg-bench-600"
            >
              <img
                src="histology/areol02.100.100.jpg"
                alt=""
                className="h-28 w-40 object-cover"
              />
              <span className="flex-1 py-3">
                <span className="block text-xl font-semibold">
                  {lab.icon} {t(lab.titleKey)}
                </span>
                <span className="block text-sm text-bench-300">
                  {t("app.histologyHint")}
                </span>
              </span>
            </Link>
          ))}
        </>
      )}
    </div>
  );
}

/** Tarjetas de los laboratorios con experimentos */
function LabGrid(): ReactNode {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {labs
        .filter((l) => !l.reference)
        .map((lab) => {
          const enabled = Boolean(lab.component);
          const body = (
            <>
              <span className="text-3xl">{lab.icon}</span>
              <span className="flex-1">
                <span className="block text-xs text-bench-300">
                  #{lab.number}
                </span>
                <span className="block font-semibold">{t(lab.titleKey)}</span>
                {!enabled && (
                  <span className="text-xs text-bench-300">
                    {t("app.comingSoon")}
                  </span>
                )}
              </span>
            </>
          );
          const cls =
            "flex items-center gap-3 rounded-xl border p-4 text-left transition-colors " +
            (enabled
              ? "border-sky-400/60 bg-bench-700 hover:bg-bench-600"
              : "cursor-not-allowed border-bench-600 bg-bench-800 opacity-50");
          return enabled ? (
            <Link key={lab.id} to={`/lab/${lab.id}`} className={cls}>
              {body}
            </Link>
          ) : (
            <div key={lab.id} className={cls} aria-disabled>
              {body}
            </div>
          );
        })}
    </div>
  );
}

function LabRoute(): ReactNode {
  const { labId } = useParams();
  const lab = labs.find((l) => l.id === labId);
  if (!lab?.component) return <Navigate to="/" replace />;
  const Component = lab.component;
  return <Component />;
}
