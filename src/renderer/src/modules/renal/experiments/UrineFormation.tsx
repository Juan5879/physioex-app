import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import type { DataColumn } from '@/shared/components/DataTable'
import { DataSetTable, PrintDataSets } from '@/shared/components/DataSetTable'
import { DropperBottle } from '@/shared/components/LabGlass'
import { ExperimentTools } from '@/shared/components/ExperimentTools'
import { Stepper } from '@/shared/components/Stepper'
import { ToolbarPortal } from '@/shared/components/ToolbarSlot'
import { Button, Light, Notice, Panel, Readout } from '@/shared/components/ui'
import { fixed } from '@/shared/lib/format'
import { useFrameLoop } from '@/shared/lib/useFrameLoop'
import { Beaker, Nephron } from '../components/Nephron'
import { UF, segmentConcentration, urineConcentration, urineFormation, type Segment, type UrineResult } from '../model/renal'
import { useUrineSets, type UrineRow } from '../store'

/** duración de la corrida y momento en que cae la orina (25 frames, como el original) */
const RUN_FRAMES = 70
const URINE_FROM = 30
const URINE_FRAMES = 25

export function urineColumns(t: TFunction): DataColumn<UrineRow>[] {
  const pa = (v: boolean): string => t(v ? 'values.present' : 'values.absent')
  return [
    { key: 'glucose', header: t('columns.glucose'), value: (r) => r.glucose, format: (r) => fixed(r.glucose) },
    { key: 'potassium', header: t('columns.potassium'), value: (r) => r.potassium, format: (r) => fixed(r.potassium) },
    { key: 'urineVolume', header: t('columns.urineVolume'), value: (r) => r.urineVolume, format: (r) => fixed(r.urineVolume) },
    { key: 'urineConc', header: t('columns.urineConc'), value: (r) => r.urineConc, format: (r) => fixed(r.urineConc) },
    { key: 'gradient', header: t('columns.gradient'), value: (r) => r.gradient, format: (r) => String(r.gradient) },
    { key: 'aldosterone', header: t('columns.aldosterone'), value: () => NaN, format: (r) => pa(r.aldosterone) },
    { key: 'adh', header: t('columns.adh'), value: () => NaN, format: (r) => pa(r.adh) }
  ]
}

/** Experimento 2: reabsorción de glucosa, gradiente medular, ADH y aldosterona */
export function UrineFormation(): ReactNode {
  const { t } = useTranslation('renal')
  const sets = useUrineSets()
  const [carriers, setCarriers] = useState<number>(UF.carriers.initial)
  const [appliedCarriers, setAppliedCarriers] = useState<number>(UF.carriers.initial)
  const [gradient, setGradient] = useState<number>(UF.gradient.initial)
  const [appliedGradient, setAppliedGradient] = useState<number>(UF.gradient.initial)
  const [adh, setAdh] = useState(false)
  const [ald, setAld] = useState(false)
  const [valveOpen, setValveOpen] = useState(true)
  const [running, setRunning] = useState(false)
  const [frame, setFrame] = useState(0)
  const [run, setRun] = useState<{ res: UrineResult; adh: boolean; ald: boolean } | null>(null)
  /** el original conservaba la última concentración de orina cuando no la recalculaba */
  const [urineConc, setUrineConc] = useState(0)
  const [reading, setReading] = useState<{ segment: Segment; value: number } | null>(null)
  const [recordable, setRecordable] = useState(false)
  const [alert, setAlert] = useState<string | null>(null)

  useFrameLoop(running, () => {
    const f = frame + 1
    setFrame(f)
    if (f >= RUN_FRAMES) {
      setRunning(false)
      // las hormonas se lavan al terminar la corrida
      setAdh(false)
      setAld(false)
      setRecordable(true)
    }
  })

  const start = (): void => {
    const res = urineFormation({ carriers: appliedCarriers, gradient: appliedGradient, adh, aldosterone: ald, valveOpen })
    const conc = urineConcentration(adh, res.urineVolume, appliedGradient)
    if (!valveOpen) setUrineConc(0)
    else if (conc !== null) setUrineConc(conc)
    setRun({ res, adh, ald })
    setFrame(0)
    setReading(null)
    setRecordable(false)
    setRunning(true)
  }

  const urineShown = run
    ? running
      ? frame < URINE_FROM
        ? 0
        : run.res.urineVolume * Math.min(1, (frame - URINE_FROM) / URINE_FRAMES)
      : run.res.urineVolume
    : null
  const coating = adh && ald ? '#ffff00' : adh ? '#00ff00' : ald ? '#ff0000' : null
  const columns = urineColumns(t)
  const label = (n: string): string => t(`sets.${n}`, { defaultValue: n })

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_200px] gap-3 p-3">
      <ToolbarPortal>
        <ExperimentTools
          lab={t('title')}
          experiment={t('experiments.uf')}
          columns={columns}
          rows={sets.sets[sets.selected]?.rows ?? []}
          printableData={<PrintDataSets sets={sets.sets} columns={columns} label={label} />}
        />
      </ToolbarPortal>

      <div className="flex flex-col gap-3">
        <Panel className="flex flex-wrap items-end justify-center gap-3" >
          <Button onClick={() => setAppliedCarriers(carriers)} disabled={running}>
            {t('actions.addCarriers')}
          </Button>
          <Stepper
            label={t('fields.carriers')}
            display={String(carriers)}
            disabled={running}
            edit={{ ...UF.carriers, value: carriers, onChange: setCarriers }}
          />
          <span className="pb-2 text-xs text-bench-300">
            ({appliedCarriers})
          </span>
        </Panel>
        <div className="rounded-xl bg-gradient-to-b from-bench-50/15 to-bench-50/5 p-2">
          <Nephron
            afferent={0.5}
            efferent={0.45}
            flowing={running}
            urineFlowing={running && frame >= URINE_FROM && valveOpen}
            valveOpen={valveOpen}
            onToggleValve={running ? undefined : () => setValveOpen(!valveOpen)}
            gradient={(appliedGradient + 375) / 3375}
            coating={coating}
            onProbe={run ? (segment, pos) => setReading({ segment, value: segmentConcentration(segment, pos, appliedGradient, run.adh, urineConc) }) : undefined}
          />
        </div>
        <Panel className="flex flex-wrap items-end justify-around gap-3">
          <div className="flex flex-col items-center gap-1" title={t('hints.probe')}>
            <span className="text-sm font-semibold text-bench-100">
              {t('fields.concentration')}
              {reading ? ` · ${t(`segments.${reading.segment}`)}` : ''}
            </span>
            <Readout value={reading ? fixed(reading.value) : run ? '----' : ''} />
          </div>
          <div className="flex items-center gap-2">
            <Light on={running} />
            <Button variant="primary" onClick={start} disabled={running}>
              {t('actions.start')}
            </Button>
          </div>
          <Stepper
            label={t('fields.concGradient')}
            display={String(gradient)}
            disabled={running}
            edit={{ ...UF.gradient, value: gradient, onChange: setGradient }}
          />
          <Button onClick={() => setAppliedGradient(gradient)} disabled={running}>
            {t('actions.dispense')}
          </Button>
        </Panel>
      </div>

      <Panel className="flex flex-col items-center gap-3">
        <DropperBottle
          label={t('reagents.aldosterone')}
          color="#fca5a5"
          disabled={running}
          selected={ald}
          onClick={() => (ald ? setAlert('aldPresent') : setAld(true))}
        />
        <DropperBottle
          label={t('reagents.adh')}
          color="#86efac"
          disabled={running}
          selected={adh}
          onClick={() => (adh ? setAlert('adhPresent') : setAdh(true))}
        />
        <Button onClick={() => setValveOpen(!valveOpen)} disabled={running}>
          {valveOpen ? t('actions.valveOpen') : t('actions.valveClosed')}
        </Button>
        <Beaker level={(urineShown ?? 0) * 0.12 / 70 * 4} color="#fde047" />
        <span className="text-sm font-semibold text-bench-100">{t('fields.urineVolume')}</span>
        <Readout value={urineShown !== null ? fixed(urineShown) : ''} />
        <p className="text-center text-xs text-bench-300">{t('hints.applyFirst')}</p>
      </Panel>

      <Panel className="col-span-2">
        <DataSetTable
          store={sets}
          columns={columns}
          editable
          label={label}
          canRecord={recordable && run !== null}
          onRecord={() => {
            if (!run) return
            sets.addRow({
              glucose: Math.round(run.res.glucose * 100) / 100,
              potassium: Math.round(run.res.potassium * 100) / 100,
              urineVolume: Math.round(run.res.urineVolume * 100) / 100,
              urineConc,
              gradient,
              aldosterone: run.ald,
              adh: run.adh
            })
            setRecordable(false)
          }}
        />
      </Panel>

      {alert && <Notice title={t('alerts.title')} lines={[t(`alerts.${alert}`)]} onClose={() => setAlert(null)} />}
    </div>
  )
}
