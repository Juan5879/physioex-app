import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { LabShell } from '@/shared/components/LabShell'
import { BeakerExperiment } from './experiments/BeakerExperiment'
import { Filtration } from './experiments/Filtration'

/** Ejercicio 1 de PhysioEx: Mecanismos de transporte celular y permeabilidad */
export default function CellTransportLab(): ReactNode {
  const { t } = useTranslation('cellTransport')
  return (
    <LabShell
      title={t('title')}
      base="/lab/cellTransport"
      experiments={[
        { path: 'simple-diffusion', label: t('experiments.sd'), element: <BeakerExperiment key="sd" experiment="sd" /> },
        {
          path: 'facilitated-diffusion',
          label: t('experiments.fd'),
          element: <BeakerExperiment key="fd" experiment="fd" />
        },
        { path: 'osmosis', label: t('experiments.os'), element: <BeakerExperiment key="os" experiment="os" /> },
        { path: 'filtration', label: t('experiments.fl'), element: <Filtration /> },
        { path: 'active-transport', label: t('experiments.at'), element: <BeakerExperiment key="at" experiment="at" /> }
      ]}
    />
  )
}
