import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { LabShell } from '@/shared/components/LabShell'
import { Fluorescent } from './experiments/Fluorescent'
import { Ouchterlony } from './experiments/Ouchterlony'
import { Elisa } from './experiments/Elisa'
import { WesternBlot } from './experiments/WesternBlot'

/** Ejercicio 13 de PhysioEx: Pruebas serológicas */
export default function SerologyLab(): ReactNode {
  const { t } = useTranslation('serology')
  return (
    <LabShell
      title={t('title')}
      base="/lab/serology"
      experiments={[
        { path: 'fluorescent', label: t('experiments.dfa'), element: <Fluorescent /> },
        { path: 'ouchterlony', label: t('experiments.odd'), element: <Ouchterlony /> },
        { path: 'elisa', label: t('experiments.elisa'), element: <Elisa /> },
        { path: 'western-blot', label: t('experiments.wb'), element: <WesternBlot /> }
      ]}
    />
  )
}
