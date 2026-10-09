import { useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import type { DataColumn } from '@/shared/components/DataTable'
import { DataSetTable, PrintDataSets } from '@/shared/components/DataSetTable'
import { ExperimentTools } from '@/shared/components/ExperimentTools'
import { Stepper } from '@/shared/components/Stepper'
import { ToolbarPortal } from '@/shared/components/ToolbarSlot'
import { Button, Light, Panel, Readout } from '@/shared/components/ui'
import { fixed } from '@/shared/lib/format'
import { useFrameLoop } from '@/shared/lib/useFrameLoop'
import { Beaker, Nephron } from '../components/Nephron'
import { GF, drainFrames, glomerularFiltration, type FiltrationResult } from '../model/renal'
import { useFiltrationSets, type FiltrationRow } from '../store'

/** etapas de la animación: llenado de arteriolas (40 frames), presión a los 25, luego vaciado */
const FILL_FRAMES = 40
const PRESSURE_AT = 25
const MAX_DRAIN = 200

export function filtrationColumns(t: TFunction): DataColumn<FiltrationRow>[] {
  const c = (key: keyof FiltrationRow, header: string, dec: 0 | 2): DataColumn<FiltrationRow> => ({
    key,
    header: t(`columns.${header}`),
    value: (r) => r[key],
    format: (r) => (dec === 0 ? String(r[key]) : fixed(r[key]))
  })
  return [
    c('afferent', 'afferent', 2),
    c('efferent', 'efferent', 2),
    c('pressure', 'beakerPressure', 0),
    c('glomerularPressure', 'glomPressure', 2),
    c('gfr', 'gfr', 2),
    c('urineVolume', 'urineVolume', 2)
  ]
}

/** Experimento 1: radios de las arteriolas, presión y filtración glomerular */
export function GlomerularFiltration(): ReactNode {
  const { t } = useTranslation('renal')
  const sets = useFiltrationSets()
  const [afferent, setAfferent] = useState<number>(GF.afferent.initial)
  const [efferent, setEfferent] = useState<number>(GF.efferent.initial)
  const [pressure, setPressure] = useState<number>(GF.pressure.initial)
  const [valveOpen, setValveOpen] = useState(true)
  const [running, setRunning] = useState(false)
  const [refilling, setRefilling] = useState(false)
  const [frame, setFrame] = useState(0)
  /** niveles de los vasos: sangre (izq.), sangre filtrada (der.), orina */
  const [levels, setLevels] = useState({ left: 1, right: 0, urine: 0 })
  const [result, setResult] = useState<FiltrationResult | null>(null)
  const [done, setDone] = useState(false)
  const [recordable, setRecordable] = useState(false)
  const start0 = useRef(levels)

  const drain = result ? Math.max(20, Math.min(MAX_DRAIN, Math.round(drainFrames(result.afferentFlow)))) : 1
  const progress = Math.max(0, Math.min(1, (frame - FILL_FRAMES) / drain))

  useFrameLoop(running || refilling, () => {
    if (refilling) {
      setLevels((l) => {
        const left = Math.min(1, l.left + 0.07)
        if (left >= 1) setRefilling(false)
        return { left, right: left >= 1 ? 0 : l.right * 0.85, urine: left >= 1 ? 0 : l.urine * 0.85 }
      })
      return
    }
    if (!result) return
    const f = frame + 1
    setFrame(f)
    if (f > FILL_FRAMES) {
      const p = Math.min(1, (f - FILL_FRAMES) / drain)
      const s = start0.current
      const left = Math.max(0, s.left * (1 - p))
      const urine = s.urine + (result.urineVolume / 300) * s.left * p
      setLevels({ left, right: s.right + (s.left - left) * (1 - result.urineVolume / 3500), urine })
      if (p >= 1) {
        setRunning(false)
        setDone(true)
        setRecordable(true)
      }
    }
  })

  const changed = (set: (v: number) => void) => (v: number) => {
    set(v)
    setResult(null)
    setDone(false)
    setRecordable(false)
  }

  const start = (): void => {
    if (running) {
      setRunning(false)
      setResult(null)
      setDone(false)
      setFrame(0)
      return
    }
    start0.current = levels
    setResult(glomerularFiltration(afferent, efferent, pressure, valveOpen))
    setFrame(0)
    setDone(false)
    setRecordable(false)
    setRunning(true)
  }

  const showPressure = result && (done || frame >= PRESSURE_AT)
  const urineSoFar = result && frame > FILL_FRAMES ? result.urineVolume * progress : null
  const columns = filtrationColumns(t)
  const label = (n: string): string => t(`sets.${n}`, { defaultValue: n })

  return (
    <div className="grid grid-cols-[260px_minmax(0,1fr)] gap-3 p-3">
      <ToolbarPortal>
        <ExperimentTools
          lab={t('title')}
          experiment={t('experiments.gf')}
          columns={columns}
          rows={sets.sets[sets.selected]?.rows ?? []}
          printableData={<PrintDataSets sets={sets.sets} columns={columns} label={label} />}
        />
      </ToolbarPortal>

      <Panel className="flex flex-col gap-3">
        <Stepper
          label={t('fields.afferent')}
          display={fixed(afferent)}
          disabled={running}
          edit={{ ...GF.afferent, value: afferent, onChange: changed(setAfferent) }}
        />
        <Stepper
          label={t('fields.efferent')}
          display={fixed(efferent)}
          disabled={running}
          edit={{ ...GF.efferent, value: efferent, onChange: changed(setEfferent) }}
        />
        <Stepper
          label={t('fields.pressure')}
          display={String(pressure)}
          disabled={running}
          edit={{ ...GF.pressure, value: pressure, onChange: changed(setPressure) }}
        />
        <div className="flex justify-center gap-2">
          <Beaker level={levels.left} color="#b91c1c" />
          <Beaker level={levels.right} color="#fca5a5" />
        </div>
        <div className="flex justify-center gap-2">
          <div className="flex items-center gap-2">
            <Light on={running} />
            <Button variant="primary" onClick={start} disabled={refilling}>
              {running ? t('actions.stop') : t('actions.start')}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Light on={refilling} />
            <Button onClick={() => setRefilling(true)} disabled={running || refilling || levels.left >= 1}>
              {t('actions.refill')}
            </Button>
          </div>
        </div>
      </Panel>

      <div className="flex flex-col gap-3">
        <Panel className="flex flex-wrap items-center justify-center gap-6">
          <div className="flex items-center gap-2">
            <Readout value={showPressure ? fixed(result.glomerularPressure) : running ? '----' : ''} />
            <span className="text-sm">{t('fields.glomPressure')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Readout value={result ? fixed(result.gfr) : ''} />
            <span className="text-sm">{t('fields.gfr')}</span>
          </div>
        </Panel>
        <div className="flex items-end gap-3 rounded-xl bg-gradient-to-b from-bench-50/15 to-bench-50/5 p-2">
          <div className="min-w-0 flex-1">
            <Nephron
              afferent={afferent}
              efferent={efferent}
              flowing={running}
              urineFlowing={running && frame > FILL_FRAMES && valveOpen}
              valveOpen={valveOpen}
              onToggleValve={running ? undefined : () => setValveOpen(!valveOpen)}
            />
          </div>
          <div className="flex flex-col items-center gap-2">
            <Button onClick={() => setValveOpen(!valveOpen)} disabled={running}>
              {valveOpen ? t('actions.valveOpen') : t('actions.valveClosed')}
            </Button>
            <Beaker level={Math.min(1, levels.urine)} color="#fde047" />
            <span className="text-sm font-semibold text-bench-100">{t('fields.urineVolume')}</span>
            <Readout value={done && result ? fixed(result.urineVolume) : urineSoFar !== null ? fixed(urineSoFar) : running ? '----' : ''} />
          </div>
        </div>
      </div>

      <Panel className="col-span-2">
        <DataSetTable
          store={sets}
          columns={columns}
          editable
          label={label}
          canRecord={recordable && result !== null}
          onRecord={() => {
            if (!result) return
            sets.addRow({
              afferent,
              efferent,
              pressure,
              glomerularPressure: Math.round(result.glomerularPressure * 100) / 100,
              gfr: Math.round(result.gfr * 100) / 100,
              urineVolume: Math.round(result.urineVolume * 100) / 100
            })
            setRecordable(false)
          }}
        />
      </Panel>
    </div>
  )
}
