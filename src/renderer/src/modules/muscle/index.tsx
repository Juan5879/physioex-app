import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { LabShell } from '@/shared/components/LabShell'
import { SingleStimulus } from './experiments/SingleStimulus'
import { MultipleStimulus } from './experiments/MultipleStimulus'
import { Isometric } from './experiments/Isometric'
import { Isotonic } from './experiments/Isotonic'

/** Ejercicio 2 de PhysioEx: Fisiología del músculo esquelético */
export default function MuscleLab(): ReactNode {
  const { t } = useTranslation('muscle')
  return (
    <LabShell
      title={t('title')}
      base="/lab/muscle"
      experiments={[
        { path: 'single', label: t('experiments.single'), element: <SingleStimulus /> },
        { path: 'multiple', label: t('experiments.multiple'), element: <MultipleStimulus /> },
        { path: 'isometric', label: t('experiments.isometric'), element: <Isometric /> },
        { path: 'isotonic', label: t('experiments.isotonic'), element: <Isotonic /> }
      ]}
    />
  )
}
