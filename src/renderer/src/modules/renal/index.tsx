import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { LabShell } from '@/shared/components/LabShell'
import { GlomerularFiltration } from './experiments/GlomerularFiltration'
import { UrineFormation } from './experiments/UrineFormation'

/** Ejercicio 9 de PhysioEx: Fisiología del sistema renal */
export default function RenalLab(): ReactNode {
  const { t } = useTranslation('renal')
  return (
    <LabShell
      title={t('title')}
      base="/lab/renal"
      experiments={[
        { path: 'glomerular-filtration', label: t('experiments.gf'), element: <GlomerularFiltration /> },
        { path: 'urine-formation', label: t('experiments.uf'), element: <UrineFormation /> }
      ]}
    />
  )
}
