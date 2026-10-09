import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { LabShell } from '@/shared/components/LabShell'
import { ElectricalStimulation } from './experiments/ElectricalStimulation'
import { HeartModifiers } from './experiments/HeartModifiers'

/** Ejercicio 6 de PhysioEx: Fisiología cardiovascular de la rana */
export default function FrogCardioLab(): ReactNode {
  const { t } = useTranslation('frogCardio')
  return (
    <LabShell
      title={t('title')}
      base="/lab/frogCardio"
      experiments={[
        { path: 'electrical-stimulation', label: t('experiments.es'), element: <ElectricalStimulation /> },
        { path: 'modifiers', label: t('experiments.mr'), element: <HeartModifiers /> }
      ]}
    />
  )
}
