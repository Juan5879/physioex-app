import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { LabShell } from '@/shared/components/LabShell'
import { Hematocrit } from './experiments/Hematocrit'
import { Sedimentation } from './experiments/Sedimentation'
import { Hemoglobin } from './experiments/Hemoglobin'
import { Typing } from './experiments/Typing'
import { Cholesterol } from './experiments/Cholesterol'

/** Ejercicio 11 de PhysioEx: Análisis de sangre */
export default function BloodLab(): ReactNode {
  const { t } = useTranslation('blood')
  return (
    <LabShell
      title={t('title')}
      base="/lab/blood"
      experiments={[
        { path: 'hematocrit', label: t('experiments.hct'), element: <Hematocrit /> },
        { path: 'sedimentation', label: t('experiments.esr'), element: <Sedimentation /> },
        { path: 'hemoglobin', label: t('experiments.hb'), element: <Hemoglobin /> },
        { path: 'typing', label: t('experiments.type'), element: <Typing /> },
        { path: 'cholesterol', label: t('experiments.chol'), element: <Cholesterol /> }
      ]}
    />
  )
}
