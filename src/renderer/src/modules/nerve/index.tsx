import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { LabShell } from '@/shared/components/LabShell'
import { Eliciting } from './experiments/Eliciting'
import { Inhibiting } from './experiments/Inhibiting'
import { Conduction } from './experiments/Conduction'

/** Ejercicio 3 de PhysioEx: Neurofisiología de los impulsos nerviosos */
export default function NerveLab(): ReactNode {
  const { t } = useTranslation('nerve')
  return (
    <LabShell
      title={t('title')}
      base="/lab/nerve"
      experiments={[
        { path: 'eliciting', label: t('experiments.eni'), element: <Eliciting /> },
        { path: 'inhibiting', label: t('experiments.ini'), element: <Inhibiting /> },
        { path: 'conduction', label: t('experiments.ncv'), element: <Conduction /> }
      ]}
    />
  )
}
