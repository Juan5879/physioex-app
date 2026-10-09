import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { LabShell } from '@/shared/components/LabShell'
import { RespiratoryAB } from './experiments/Respiratory'
import { Metabolic } from './experiments/Metabolic'
import { RenalCompensation } from './experiments/RenalCompensation'

/** Ejercicio 10 de PhysioEx: Equilibrio ácido-base */
export default function AcidBaseLab(): ReactNode {
  const { t } = useTranslation('acidBase')
  return (
    <LabShell
      title={t('title')}
      base="/lab/acidBase"
      experiments={[
        { path: 'respiratory', label: t('experiments.raa'), element: <RespiratoryAB /> },
        { path: 'metabolic', label: t('experiments.maa'), element: <Metabolic /> },
        { path: 'renal', label: t('experiments.rsc'), element: <RenalCompensation /> }
      ]}
    />
  )
}
