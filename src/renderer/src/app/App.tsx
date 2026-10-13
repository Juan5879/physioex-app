import { Suspense, useState, type ReactNode } from "react";
import {
  HashRouter,
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useParams,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import { labs } from "@/modules/registry";
import { LANGUAGES } from "@/shared/i18n";
import { Icon } from "@/shared/components/Icon";
import { labNumber } from "@/shared/components/LabShell";
import { LogoMark } from "@/shared/components/Logo";
import { Button, Modal } from "@/shared/components/ui";
import { THEMES, useTheme } from "@/shared/lib/theme";
import { UpdateNotice } from "./UpdateNotice";
import { ErrorBoundary } from "./ErrorBoundary";

export function App(): ReactNode {
  const [about, setAbout] = useState(false);
  return (
    <HashRouter>
      <div className="px-shell no-print">
        <TopBar />
        <main className="px-shell__main">
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
        <Footer onAbout={() => setAbout(true)} />
      </div>
      {about && <AboutDialog onClose={() => setAbout(false)} />}
    </HashRouter>
  );
}

function TopBar(): ReactNode {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  return (
    <header className="px-appbar">
      <Link to="/" className="px-brand">
        <LogoMark size={24} className="self-center" />
        <b>{t("app.title")}</b>
        <span>{t("app.brandTag")}</span>
      </Link>
      <nav className="px-nav" aria-label={t("app.nav")}>
        <NavLink to="/" end>
          <Icon name="home" />
          {t("app.home")}
        </NavLink>
        <NavLink to="/lab/histology">
          <Icon name="microscope" />
          {t("labs.histology")}
        </NavLink>
      </nav>
      <div className="px-appbar__end">
        <UpdateNotice />
        <div className="px-seg" role="group" aria-label={t("app.theme")}>
          {THEMES.map((th) => (
            <button
              key={th}
              type="button"
              aria-pressed={theme === th}
              onClick={() => setTheme(th)}
            >
              {t(th === "dark" ? "app.themeDark" : "app.themeLight")}
            </button>
          ))}
        </div>
        <div className="px-seg" role="group" aria-label={t("app.language")}>
          {LANGUAGES.map((lng) => (
            <button
              key={lng}
              type="button"
              aria-pressed={i18n.language === lng}
              onClick={() => i18n.changeLanguage(lng)}
            >
              {lng.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

function Footer({ onAbout }: { onAbout: () => void }): ReactNode {
  const { t } = useTranslation();
  return (
    <footer className="px-footer">
      <span>
        {t("app.footer")}{" "}
        <button type="button" className="px-linkbtn" onClick={onAbout}>
          {t("app.aboutTitle")}
        </button>
      </span>
      <span className="px-poweredby">
        Powered by <b>NovusElit</b>
      </span>
    </footer>
  );
}

function AboutDialog({ onClose }: { onClose: () => void }): ReactNode {
  const { t } = useTranslation();
  return (
    <Modal title={t("app.aboutTitle")} onClose={onClose}>
      <p className="px-modal__text">{t("app.aboutBody")}</p>
      <div className="px-modal__actions">
        <Button variant="primary" autoFocus onClick={onClose}>
          {t("common.close")}
        </Button>
      </div>
    </Modal>
  );
}

function Home(): ReactNode {
  const { t } = useTranslation();
  const experiments = labs.filter((l) => !l.reference && l.component);
  const references = labs.filter((l) => l.reference);
  return (
    <div className="px-container" style={{ maxWidth: 1100, paddingTop: "var(--space-6)" }}>
      <div className="px-eyebrow">{t("app.eyebrow")}</div>
      <h1 className="mt-2 mb-1.5 flex items-center gap-4 font-[family-name:var(--font-display)] text-[40px] leading-[44px] font-semibold tracking-[-0.01em]">
        <LogoMark size={48} detailed />
        {t("app.title")}
      </h1>
      <p className="m-0 max-w-[620px] text-[color:var(--ink-muted)]">
        {t("app.intro")}
      </p>

      <div className="mt-9 mb-3 flex items-baseline justify-between">
        <h2 className="px-panel__title m-0">{t("app.labsHeading")}</h2>
        <span className="px-eyebrow">
          {t("app.available", { count: experiments.length })}
        </span>
      </div>
      <div className="px-labgrid">
        {experiments.map((lab) => (
          <Link key={lab.id} to={`/lab/${lab.id}`} className="px-labcard">
            <span className="n">{labNumber(lab.number)}</span>
            <span className="t">{t(lab.titleKey)}</span>
            <span className="m">{t(`systems.${lab.id}`)}</span>
            <span className="go">
              <Icon name="arrowRight" />
            </span>
          </Link>
        ))}
      </div>

      {references.length > 0 && (
        <>
          <h2 className="px-panel__title mt-9 mb-3">{t("app.reference")}</h2>
          {references.map((lab) => (
            <Link
              key={lab.id}
              to={`/lab/${lab.id}`}
              className="px-labcard"
              style={{ gridTemplateColumns: "auto 1fr auto", padding: 12 }}
            >
              <img
                src="histology/areol02.100.100.jpg"
                alt=""
                className="px-well h-24 w-37 object-cover"
              />
              <span className="grid gap-1">
                <span className="t">{t(lab.titleKey)}</span>
                <span className="m" style={{ gridColumn: "auto" }}>
                  {t("app.histologyHint")}
                </span>
              </span>
              <span className="go" style={{ gridRow: "auto" }}>
                <Icon name="arrowRight" />
              </span>
            </Link>
          ))}
        </>
      )}

      <aside className="px-notice mt-6">
        <Icon name="info" />
        <div>
          <h3>{t("app.aboutTitle")}</h3>
          <p>{t("app.aboutBody")}</p>
        </div>
      </aside>
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
