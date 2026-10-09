import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { LabShell } from '@/shared/components/LabShell'
import { Metabolism } from './experiments/Metabolism'
import { HormoneReplacement } from './experiments/HormoneReplacement'
import { InsulinStandard } from './experiments/InsulinStandard'
import { InsulinDiabetes } from './experiments/InsulinDiabetes'

/** Ejercicio 4 de PhysioEx: Fisiología del sistema endocrino */
export default function EndocrineLab(): ReactNode {
  const { t } = useTranslation('endocrine')
  return (
    <LabShell
      title={t('title')}
      base="/lab/endocrine"
      experiments={[
        { path: 'metabolism', label: t('experiments.m'), element: <Metabolism /> },
        { path: 'hormone-replacement', label: t('experiments.hrt'), element: <HormoneReplacement /> },
        { path: 'insulin-1', label: t('experiments.id1'), element: <InsulinStandard /> },
        { path: 'insulin-2', label: t('experiments.id2'), element: <InsulinDiabetes /> }
      ]}
    />
  )
}
