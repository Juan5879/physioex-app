import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { UpdateStatus } from '../../../main/updateStatus'

/**
 * Indicador de actualizaciones automáticas. Sólo aparece mientras se descarga una versión
 * nueva o cuando ya está lista para instalarse al cerrar el programa.
 */
export function UpdateNotice(): ReactNode {
  const { t } = useTranslation()
  const [status, setStatus] = useState<UpdateStatus | null>(null)

  useEffect(() => window.api?.onUpdateStatus(setStatus), [])

  if (status?.state === 'downloading') {
    return (
      <span className="text-xs text-bench-300" title={t('updates.downloadingHint')}>
        ⬇ {t('updates.downloading', { version: status.version, percent: status.percent ?? 0 })}
      </span>
    )
  }
  if (status?.state === 'ready') {
    return (
      <span
        className="rounded bg-emerald-600/30 px-2 py-0.5 text-xs text-emerald-200"
        title={t('updates.readyHint')}
      >
        ✓ {t('updates.ready', { version: status.version })}
      </span>
    )
  }
  return null
}
