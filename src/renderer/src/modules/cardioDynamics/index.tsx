import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { LabShell } from '@/shared/components/LabShell'
import { VesselResistance } from './experiments/VesselResistance'
import { PumpMechanics } from './experiments/PumpMechanics'

/** Ejercicio 5 de PhysioEx: Dinámica cardiovascular */
export default function CardioDynamicsLab(): ReactNode {
  const { t } = useTranslation('cardioDynamics')
  return (
    <LabShell
      title={t('title')}
      base="/lab/cardioDynamics"
      experiments={[
        { path: 'vessel-resistance', label: t('experiments.vr'), element: <VesselResistance /> },
        { path: 'pump-mechanics', label: t('experiments.pm'), element: <PumpMechanics /> }
      ]}
    />
  )
}
