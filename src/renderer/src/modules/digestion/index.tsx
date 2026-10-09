import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { LabShell } from '@/shared/components/LabShell'
import { DigestionExperiment } from './experiments/DigestionExperiment'

/** Ejercicio 8 de PhysioEx: Procesos químicos y físicos de la digestión */
export default function DigestionLab(): ReactNode {
  const { t } = useTranslation('digestion')
  return (
    <LabShell
      title={t('title')}
      base="/lab/digestion"
      experiments={[
        { path: 'amylase', label: t('experiments.am'), element: <DigestionExperiment key="am" experiment="am" /> },
        { path: 'pepsin', label: t('experiments.pe'), element: <DigestionExperiment key="pe" experiment="pe" /> },
        { path: 'lipase', label: t('experiments.li'), element: <DigestionExperiment key="li" experiment="li" /> }
      ]}
    />
  )
}
