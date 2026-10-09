import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { LabShell } from '@/shared/components/LabShell'
import { Volumes } from './experiments/Volumes'
import { Factors } from './experiments/Factors'
import { Breathing } from './experiments/Breathing'

/** Ejercicio 7 de PhysioEx: Mecánica del sistema respiratorio */
export default function RespiratoryLab(): ReactNode {
  const { t } = useTranslation('respiratory')
  return (
    <LabShell
      title={t('title')}
      base="/lab/respiratory"
      experiments={[
        { path: 'volumes', label: t('experiments.rv'), element: <Volumes /> },
        { path: 'factors', label: t('experiments.far'), element: <Factors /> },
        { path: 'breathing', label: t('experiments.vb'), element: <Breathing /> }
      ]}
    />
  )
}
