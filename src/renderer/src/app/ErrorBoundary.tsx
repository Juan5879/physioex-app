import { Component, type ErrorInfo, type ReactNode } from 'react'
import i18n from '@/shared/i18n'

interface State {
  error: Error | null
}

/**
 * Evita que un error de renderizado deje la ventana en blanco: muestra el mensaje
 * y permite volver al menú principal.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(error, info.componentStack)
  }

  render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div className="px-container" style={{ maxWidth: 640, paddingTop: 'var(--space-6)', textAlign: 'center' }}>
        <h1 className="mb-3 font-[family-name:var(--font-display)] text-2xl font-semibold">{i18n.t('app.errorTitle')}</h1>
        <p className="mb-6 text-[color:var(--ink-muted)]">{i18n.t('app.errorBody')}</p>
        <pre className="px-well mb-6 overflow-auto p-3 text-left font-mono text-xs text-[color:var(--danger)]">
          {error.message}
        </pre>
        <button
          type="button"
          className="px-btn px-btn--primary"
          onClick={() => {
            window.location.hash = '#/'
            this.setState({ error: null })
          }}
        >
          {i18n.t('app.home')}
        </button>
      </div>
    )
  }
}
