import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/shared/components/Icon'
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
      <span className="px-chip" title={t('updates.downloadingHint')}>
        <Icon name="download" />
        {t('updates.downloading', { version: status.version, percent: status.percent ?? 0 })}
      </span>
    )
  }
  if (status?.state === 'ready') {
    return (
      <span className="px-chip px-chip--ok" title={t('updates.readyHint')}>
        <Icon name="check" />
        {t('updates.ready', { version: status.version })}
      </span>
    )
  }
  return null
}
