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
      <div className="mx-auto max-w-xl p-10 text-center">
        <h1 className="mb-3 text-2xl font-bold">{i18n.t('app.errorTitle')}</h1>
        <p className="mb-6 text-bench-300">{i18n.t('app.errorBody')}</p>
        <pre className="mb-6 overflow-auto rounded bg-black/40 p-3 text-left text-xs text-rose-300">
          {error.message}
        </pre>
        <button
          type="button"
          className="rounded-md bg-sky-500 px-4 py-2 font-semibold text-white hover:bg-sky-400"
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
