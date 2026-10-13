import { ResultsTable } from '@/shared/components/DataTable'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import type { DataColumn } from '@/shared/components/DataTable'
import { ExperimentTools } from '@/shared/components/ExperimentTools'
import { PrintTable } from '@/shared/components/PrintReport'
import { ToolbarPortal } from '@/shared/components/ToolbarSlot'
import { Button, Hint, Light, Panel } from '@/shared/components/ui'
import { fixed } from '@/shared/lib/format'
import { DropperBottle, TestTube } from '../components/Figures'
import { ProcessButtons, SpectroGraph, SpectroReadouts, useTubeProcess } from '../components/Lab'
import { STANDARD } from '../model/endocrine'
import { useStandardTable, type TubeRow } from '../store'

const N = 5
type Reagent = 'glucose' | 'water' | 'color'

export function tubeColumns(t: TFunction): DataColumn<TubeRow>[] {
  return [
    { key: 'tube', header: t('columns.tube'), value: (r) => r.tube, format: (r) => String(r.tube) },
    {
      key: 'od',
      header: t('columns.opticalDensity'),
      value: (r) => r.opticalDensity,
      format: (r) => fixed(r.opticalDensity, 2)
    },
    { key: 'glucose', header: t('columns.glucose'), value: (r) => r.glucose, format: (r) => String(r.glucose) }
  ]
}

const zeros = (): number[] => Array(N).fill(0)

/** Experimento 3: curva patrón de glucosa con el espectrofotómetro */
export function InsulinStandard(): ReactNode {
  const { t } = useTranslation('endocrine')
  const tc = useTranslation().t
  const table = useStandardTable()
  const process = useTubeProcess()
  const [placed, setPlaced] = useState<boolean[]>(Array(N).fill(false))
  const [drops, setDrops] = useState<Record<Reagent, number[]>>({ glucose: zeros(), water: zeros(), color: zeros() })
  const [dropper, setDropper] = useState<Reagent | null>(null)
  const [setup, setSetup] = useState(false)
  /** último tubo llevado al espectrofotómetro (0 = ninguno) */
  const [spectroTube, setSpectroTube] = useState(0)
  const [inSpectro, setInSpectro] = useState(false)
  const [analyzed, setAnalyzed] = useState(false)
  const [recordable, setRecordable] = useState(false)
  const [graphed, setGraphed] = useState(false)

  const ps = process.state
  const glucoseDone = drops.glucose.join() === STANDARD.glucoseDrops.join()
  const waterDone = drops.water.join() === STANDARD.waterDrops.join()
  const colorDone = drops.color.every((d) => d === 5)

  const canDrop = (r: Reagent, i: number): boolean => {
    if (!placed[i]) return false
    if (r === 'glucose') return drops.glucose[i] < STANDARD.glucoseDrops[i]
    if (r === 'water') return glucoseDone && drops.water[i] < STANDARD.waterDrops[i]
    return ps.pelletRemoved && drops.color[i] < 5
  }

  const clickTube = (i: number): void => {
    if (!placed[i]) {
      setPlaced((p) => p.map((v, j) => (j === i ? true : v)))
      return
    }
    if (dropper && canDrop(dropper, i)) {
      const target = dropper === 'glucose' ? STANDARD.glucoseDrops[i] : dropper === 'water' ? STANDARD.waterDrops[i] : 5
      setDrops((d) => ({ ...d, [dropper]: d[dropper].map((v, j) => (j === i ? target : v)) }))
      return
    }
    // tubos en orden al espectrofotómetro
    if (setup && !inSpectro && i === spectroTube) {
      setSpectroTube(i + 1)
      setInSpectro(true)
      setAnalyzed(false)
      setRecordable(false)
    }
  }

  const cleanTubes = (): void => {
    setPlaced(Array(N).fill(false))
    setDrops({ glucose: zeros(), water: zeros(), color: zeros() })
    setDropper(null)
    process.reset()
    setSetup(false)
    setSpectroTube(0)
    setInSpectro(false)
    setAnalyzed(false)
    setRecordable(false)
    setGraphed(false)
  }

  const level = (i: number): number => (drops.glucose[i] + drops.water[i] + drops.color[i]) / 12
  const tubeColor = ps.incubated ? '#c084fc' : drops.color.some((d) => d > 0) ? '#a5b4fc' : '#93c5fd'
  // tubos ya analizados: el que está en el espectrofotómetro cuenta sólo después de "Analizar"
  const analyzedCount = inSpectro && !analyzed ? spectroTube - 1 : spectroTube
  const measured = STANDARD.glucose.slice(0, analyzedCount).map((x, i) => ({ x, y: STANDARD.opticalDensity[i] }))
  const current = inSpectro && analyzed ? spectroTube - 1 : null
  const columns = tubeColumns(t)

  return (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-4">
      <ToolbarPortal>
        <ExperimentTools
          lab={t('title')}
          experiment={t('experiments.id1')}
          columns={columns}
          rows={table.rows}
          printableData={
            <PrintTable headers={columns.map((c) => c.header)} rows={table.rows.map((r) => columns.map((c) => c.format(r)))} />
          }
        />
      </ToolbarPortal>

      <Panel title={t('panels.tubes')}>
        <Hint>{t('hints.dropper')}</Hint>
        <div className="grid grid-cols-3 gap-2">
          {(['glucose', 'water', 'color'] as const).map((r) => (
            <DropperBottle
              key={r}
              label={t(`reagents.${r}`)}
              color={r === 'color' ? '#c084fc' : r === 'water' ? '#e0f2fe' : '#93c5fd'}
              selected={dropper === r}
              disabled={r === 'water' ? !glucoseDone : r === 'color' ? !ps.pelletRemoved : false}
              onClick={() => setDropper(dropper === r ? null : r)}
            />
          ))}
        </div>
        <div className="px-well flex items-end justify-center gap-1 p-3">
          {Array.from({ length: N }, (_, i) => (
            <TestTube
              key={i}
              number={i + 1}
              placed={placed[i] && i >= spectroTube}
              level={level(i)}
              color={tubeColor}
              pellet={ps.centrifuged && !ps.pelletRemoved}
              shaking={ps.running === 'mix'}
              selected={setup && !inSpectro && i === spectroTube}
              onClick={() => clickTube(i)}
              title={!placed[i] ? t('panels.rack') : undefined}
            />
          ))}
        </div>
        <ProcessButtons process={process} canMix={glucoseDone && waterDone} canIncubate={colorDone} />
        <Button size="sm" onClick={cleanTubes} disabled={ps.running !== null}>
          {t('actions.cleanTubes')}
        </Button>
      </Panel>

      <Panel title={t('panels.spectro')} actions={<Light on={setup} label={setup ? tc('common.ready') : tc('common.stopped')} />}>
        <SpectroGraph points={measured} showLine={graphed} />
        <Hint>{t('hints.spectro')}</Hint>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setSetup(true)} disabled={setup || !ps.incubated}>
            {t('actions.setUp')}
          </Button>
          <Button
            onClick={() => {
              setAnalyzed(true)
              setRecordable(true)
            }}
            disabled={!inSpectro || analyzed}
          >
            {t('actions.analyze')}
          </Button>
          <Button
            onClick={() => {
              setInSpectro(false)
              setRecordable(false)
            }}
            disabled={!inSpectro || !analyzed}
          >
            {t('actions.washTube')}
          </Button>
          <Button onClick={() => setGraphed(true)} disabled={graphed || spectroTube < N || inSpectro}>
            {t('actions.graph')}
          </Button>
        </div>
        <SpectroReadouts
          od={current !== null ? STANDARD.opticalDensity[current] : null}
          glucose={current !== null ? STANDARD.glucose[current] : null}
        />
      </Panel>

      </div>

      <Panel
        title={tc('common.results')}
        actions={
        <div className="px-panel__actions">
          <Button
            size="sm"
            icon="plus"
            onClick={() => {
              if (current === null) return
              table.setRow({ tube: current + 1, opticalDensity: STANDARD.opticalDensity[current], glucose: STANDARD.glucose[current] })
              setRecordable(false)
            }}
            disabled={!recordable || current === null}
          >
            {t('actions.record')}
          </Button>
          <Button size="sm" variant="danger" icon="trash" onClick={table.clear} disabled={table.rows.length === 0}>
            {tc('common.clearTable')}
          </Button>
        </div>
        }
      >
        <ResultsTable columns={columns} rows={table.rows} selected={null} onSelect={() => undefined} />
      </Panel>
    </>
  )
}

