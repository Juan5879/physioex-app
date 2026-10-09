import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import type { DataColumn } from '@/shared/components/DataTable'
import { ExperimentTools } from '@/shared/components/ExperimentTools'
import { PrintTable } from '@/shared/components/PrintReport'
import { Stepper } from '@/shared/components/Stepper'
import { ToolbarPortal } from '@/shared/components/ToolbarSlot'
import { Button, Light, Panel } from '@/shared/components/ui'
import { fixed } from '@/shared/lib/format'
import { DropperBottle, RatFigure, TestTube } from '../components/Figures'
import { ProcessButtons, SpectroGraph, SpectroReadouts, useTubeProcess } from '../components/Lab'
import { DIABETES, GLUCOSE_READING } from '../model/endocrine'
import { useDiabetesRuns, type DiabetesRow } from '../store'

const N = 4
type Reagent = 'water' | 'barium' | 'heparin' | 'color'
/** gotas de cada reactivo por tubo; cada uno requiere el anterior en todos los tubos */
const DROPS: Record<Reagent, number> = { water: 5, barium: 5, heparin: 1, color: 5 }

export function diabetesColumns(t: TFunction): DataColumn<DiabetesRow>[] {
  const yn = (v: boolean): string => t(v ? 'yesNo.yes' : 'yesNo.no')
  return [
    { key: 'tube', header: t('columns.tube'), value: (r) => r.tube, format: (r) => String(r.tube) },
    { key: 'od', header: t('columns.opticalDensity'), value: (r) => r.opticalDensity, format: (r) => fixed(r.opticalDensity, 2) },
    { key: 'glucose', header: t('columns.glucose'), value: (r) => r.glucose, format: (r) => String(r.glucose) },
    { key: 'insulin', header: t('columns.insulin'), value: () => NaN, format: (r) => yn(r.insulin) },
    { key: 'saline', header: t('columns.saline2'), value: () => NaN, format: (r) => yn(r.saline) },
    { key: 'alloxan', header: t('columns.alloxan'), value: () => NaN, format: (r) => yn(r.alloxan) }
  ]
}

/**
 * Paso de cada rata (rat_process del original): 0 sin inyectar, 1 inyectada, 3 primera muestra
 * en su tubo, 4 con insulina, 6 segunda muestra en su tubo.
 */
type RatProcess = 0 | 1 | 3 | 4 | 6

const zeros = (): number[] => Array(N).fill(0)

/** Experimento 4: glucemia de una rata control y una diabética (aloxano), antes y después de insulina */
export function InsulinDiabetes(): ReactNode {
  const { t } = useTranslation('endocrine')
  const tc = useTranslation().t
  const store = useDiabetesRuns()
  const [run, setRun] = useState(-1)
  const [viewRun, setViewRun] = useState<number | null>(null)
  const [rats, setRats] = useState<[RatProcess, RatProcess]>([0, 0])
  const [placed, setPlaced] = useState<boolean[]>(Array(N).fill(false))
  const [reagents, setReagents] = useState(false)
  const [drops, setDrops] = useState<Record<Reagent, number[]>>({
    water: zeros(),
    barium: zeros(),
    heparin: zeros(),
    color: zeros()
  })
  const [dropper, setDropper] = useState<Reagent | null>(null)
  const process = useTubeProcess()
  const [setup, setSetup] = useState(false)
  const [spectroTube, setSpectroTube] = useState(0)
  const [inSpectro, setInSpectro] = useState(false)
  const [analyzed, setAnalyzed] = useState(false)
  const [ggs, setGgs] = useState(false)
  const [reading, setReading] = useState(0)
  const [recordable, setRecordable] = useState(false)

  // cada vez que se entra al experimento empieza una corrida nueva
  useEffect(() => {
    setRun(useDiabetesRuns.getState().startRun())
  }, [])

  const ps = process.state
  const all = (r: Reagent): boolean => drops[r].every((d) => d === DROPS[r])
  const prereq: Record<Reagent, boolean> = {
    water: true,
    barium: all('water'),
    heparin: all('barium'),
    color: ps.pelletRemoved
  }

  const advance = (rat: 0 | 1): void => {
    const p = rats[rat]
    let next: RatProcess = p
    if (p === 1 || p === 4) {
      // muestra de sangre al tubo: la primera va a los tubos 1–2 y la segunda a los 3–4
      const tube = (p === 1 ? 0 : 2) + rat
      setPlaced((pl) => pl.map((v, i) => (i === tube ? true : v)))
      next = p === 1 ? 3 : 6
    } else if (p === 0) next = 1
    else if (p === 3) next = 4
    setRats((r) => (rat === 0 ? [next, r[1]] : [r[0], next]))
  }

  const clickTube = (i: number): void => {
    if (reagents && dropper && placed[i] && prereq[dropper] && drops[dropper][i] < DROPS[dropper]) {
      setDrops((d) => ({ ...d, [dropper]: d[dropper].map((v, j) => (j === i ? DROPS[dropper] : v)) }))
      return
    }
    if (setup && !inSpectro && i === spectroTube) {
      setSpectroTube(i + 1)
      setInSpectro(true)
      setAnalyzed(false)
      setRecordable(false)
    }
  }

  const current = inSpectro && analyzed ? spectroTube - 1 : null
  const columns = diabetesColumns(t)
  const shownRun = viewRun ?? run
  const rows = store.runs[shownRun] ?? []
  const allRows = store.runs.flat()

  const ratPanel = (rat: 0 | 1): ReactNode => {
    const p = rats[rat]
    const first = rat === 0 ? 'saline' : 'alloxan'
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-bench-500 bg-bench-900 p-2">
        <svg viewBox="0 0 100 60" className="h-9 w-14">
          <RatFigure />
        </svg>
        <span className="w-24 text-sm font-semibold">{t(`rats.${rat === 0 ? 'control' : 'experimental'}`)}</span>
        <Button onClick={() => advance(rat)} disabled={p !== 0}>
          {t('actions.inject')}: {t(`reagents.${first}`)}
        </Button>
        <Button onClick={() => advance(rat)} disabled={p !== 1 && p !== 4}>
          {t('actions.drawBlood')}
        </Button>
        <Button onClick={() => advance(rat)} disabled={p !== 3}>
          {t('actions.inject')}: {t('reagents.insulin')}
        </Button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 p-3">
      <ToolbarPortal>
        <ExperimentTools
          lab={t('title')}
          experiment={t('experiments.id2')}
          columns={columns}
          rows={allRows}
          printableData={
            <div className="space-y-4">
              {store.runs.map((r, i) =>
                r.length ? (
                  <div key={i}>
                    <p className="mb-1 font-semibold">
                      {t('fields.run')} {i + 1}
                    </p>
                    <PrintTable headers={columns.map((c) => c.header)} rows={r.map((row) => columns.map((c) => c.format(row)))} />
                  </div>
                ) : null
              )}
            </div>
          }
        />
      </ToolbarPortal>

      <Panel className="flex flex-col gap-3">
        {!reagents ? (
          <>
            {ratPanel(0)}
            {ratPanel(1)}
            <Button variant="primary" onClick={() => setReagents(true)} disabled={!(rats[0] === 6 && rats[1] === 6)}>
              {t('actions.obtainReagents')}
            </Button>
          </>
        ) : (
          <>
            <p className="text-xs text-bench-300">{t('hints.dropper')}</p>
            <div className="grid grid-cols-4 gap-2">
              {(['water', 'barium', 'heparin', 'color'] as const).map((r) => (
                <DropperBottle
                  key={r}
                  label={t(`reagents.${r}`)}
                  color={r === 'color' ? '#c084fc' : r === 'heparin' ? '#fde68a' : r === 'barium' ? '#e5e7eb' : '#e0f2fe'}
                  selected={dropper === r}
                  disabled={!prereq[r]}
                  onClick={() => setDropper(dropper === r ? null : r)}
                />
              ))}
            </div>
          </>
        )}
        <div className="flex items-end justify-center gap-1 rounded-lg bg-bench-900 p-2">
          {Array.from({ length: N }, (_, i) => (
            <TestTube
              key={i}
              number={i + 1}
              placed={placed[i] && i >= spectroTube}
              level={0.2 + (drops.water[i] + drops.barium[i] + drops.heparin[i] + drops.color[i]) / 25}
              color={ps.incubated ? '#c084fc' : ps.pelletRemoved ? '#fca5a5' : '#b91c1c'}
              pellet={ps.centrifuged && !ps.pelletRemoved}
              shaking={ps.running === 'mix'}
              selected={setup && !inSpectro && i === spectroTube}
              onClick={() => clickTube(i)}
            />
          ))}
        </div>
        {reagents && (
          <ProcessButtons process={process} canMix={all('heparin')} canIncubate={all('color')} />
        )}
      </Panel>

      <Panel className="flex flex-col gap-3">
        <div className="rounded-xl border-4 border-gray-400 bg-gray-300 p-2">
          <SpectroGraph points={[]} showLine={ggs} readingX={ggs ? reading : null} />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Light on={setup} />
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
          <Button onClick={() => setGgs(!ggs)} disabled={!setup}>
            {ggs ? tc('common.clearPlot') : t('actions.graphStandard')}
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <SpectroReadouts od={current !== null ? DIABETES.opticalDensity[current] : null} glucose={ggs ? reading : null} />
          <div title={t('hints.reading')}>
            <Stepper
              label={t('fields.glucoseReading')}
              display={String(reading)}
              disabled={!ggs}
              edit={{ ...GLUCOSE_READING, value: reading, onChange: setReading }}
            />
          </div>
        </div>
      </Panel>

      <Panel className="col-span-2 flex gap-3">
        <div className="flex w-20 shrink-0 flex-col">
          <span className="mb-1 text-center text-sm font-semibold text-bench-100">{t('fields.run')}</span>
          <div className="h-32 overflow-y-auto rounded border border-black bg-black font-mono text-lcd">
            {store.runs.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setViewRun(i)}
                className={`block w-full px-2 py-0.5 text-center ${i === shownRun ? 'bg-sky-700 text-white' : 'hover:bg-bench-800'}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
        <div className="flex w-36 shrink-0 flex-col justify-center">
          <Button
            onClick={() => {
              if (current === null) return
              store.setRow(run, {
                tube: current + 1,
                opticalDensity: DIABETES.opticalDensity[current],
                glucose: reading,
                insulin: DIABETES.insulin[current],
                saline: DIABETES.saline[current],
                alloxan: DIABETES.alloxan[current]
              })
              setViewRun(null)
              setRecordable(false)
            }}
            disabled={!recordable || current === null || !ggs}
          >
            {t('actions.record')}
          </Button>
        </div>
        <div className="h-40 flex-1 overflow-y-auto rounded border border-black bg-black">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-bench-600">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className="px-2 py-1 text-center font-semibold">
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="font-mono text-lcd">
              {rows.map((r) => (
                <tr key={r.tube} className="border-t border-bench-700">
                  {columns.map((c) => (
                    <td key={c.key} className="px-2 py-1 text-center">
                      {c.format(r)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}
