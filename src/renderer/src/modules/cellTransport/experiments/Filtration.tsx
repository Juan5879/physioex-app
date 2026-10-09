import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ExperimentTools } from '@/shared/components/ExperimentTools'
import { Stepper } from '@/shared/components/Stepper'
import { ToolbarPortal } from '@/shared/components/ToolbarSlot'
import { Button, Light, Notice, Panel, Readout } from '@/shared/components/ui'
import { fix, FiltrationApparatus, liquidColor, MEMBRANE_COLORS } from '../components/Apparatus'
import { BeakerControls, clampStep, MembraneRack, PrintRuns, RunTable, SoluteValues, TimerPanel } from '../components/Panels'
import { useMinuteClock } from '../components/useMinuteClock'
import { EXPERIMENT_SOLUTES, PRESSURE, TIMER, type SoluteId } from '../model/constants'
import { filtration, residuePresent, type FiltrationResult } from '../model/filtration'
import type { Conc } from '../model/transport'
import { useRunsStore } from '../store'

const SOLUTES = EXPERIMENT_SOLUTES.fl
/** duración de la animación del análisis de residuos (21 frames a 20 fps) */
const ANALYSIS_MS = 1050

interface FiltrationRun {
  result: FiltrationResult
  mwco: number
  pressure: number
  top: Conc
  realTime: number
  /** fracción del minuto en curso, para animar el vaciado */
  frame: number
}

type Analysis = 'none' | 'due' | 'running' | 'done'

/** Experimento 4: filtración a presión a través de membranas de distinto poro */
export function Filtration(): ReactNode {
  const { t } = useTranslation('cellTransport')
  const runs = useRunsStore((s) => s.runs.fl)
  const addRun = useRunsStore((s) => s.addRun)
  const deleteRun = useRunsStore((s) => s.deleteRun)

  const [setting, setSetting] = useState<Conc>({})
  const [full, setFull] = useState(false)
  const [stale, setStale] = useState(false)
  const [pressure, setPressure] = useState(PRESSURE.initial)
  const [maxTime, setMaxTime] = useState(TIMER.initial)
  const [mwco, setMwco] = useState<number | null>(null)
  const [run, setRun] = useState<FiltrationRun | null>(null)
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const [analysis, setAnalysis] = useState<Analysis>('none')
  const [recordable, setRecordable] = useState(false)
  const [notice, setNotice] = useState<{ title: string; lines: string[] } | null>(null)
  const [dispensing, setDispensing] = useState(false)

  const invalidate = (): void => setRecordable(false)

  const finish = (r: FiltrationRun): void => {
    setRunning(false)
    setFinished(true)
    setStale(true)
    setAnalysis('due')
    const time = fix(r.result.timeRequired, 2)
    setNotice({
      title: t('messages.results'),
      lines: [
        t(r.realTime >= r.result.timeRequired ? 'messages.filtrationDone' : 'messages.filtrationStopped', { time }),
        t('messages.moveToAnalysis')
      ]
    })
  }

  useMinuteClock(
    running,
    () => {
      if (!run) return
      const realTime = run.realTime + 1
      const next = { ...run, realTime, frame: 0 }
      if (realTime > maxTime || realTime >= run.result.timeRequired) {
        // el reloj se detiene en el último minuto mostrado
        const done = { ...next, realTime: Math.min(realTime, maxTime) }
        setRun(done)
        finish(done)
        return
      }
      setRun(next)
    },
    (frame) => setRun((r) => (r ? { ...r, frame } : r))
  )

  const start = (): void => {
    if (running) {
      // "Detener" a mitad de la filtración descarta la corrida y vacía el vaso
      setRunning(false)
      flush()
      return
    }
    const lines: string[] = []
    if (stale) lines.push(t('messages.flush'))
    else {
      if (!full) lines.push(t('messages.topEmpty'))
      if (mwco === null) lines.push(t('messages.noMembrane'))
    }
    if (analysis === 'due') lines.splice(0, lines.length, t('messages.analyze'))
    if (lines.length || mwco === null) {
      setNotice({ title: t('messages.title'), lines })
      return
    }
    setRun({ result: filtration(pressure, mwco, setting), mwco, pressure, top: { ...setting }, realTime: 0, frame: 0 })
    setFinished(false)
    setAnalysis('none')
    invalidate()
    setRunning(true)
  }

  const flush = (): void => {
    setFull(false)
    setStale(false)
    setRun(null)
    setFinished(false)
    setAnalysis('none')
    invalidate()
  }

  const analyze = (): void => {
    setAnalysis('running')
    window.setTimeout(() => {
      setAnalysis('done')
      // la membrana queda en la ventana de análisis
      setMwco(null)
      setRecordable(true)
    }, ANALYSIS_MS)
  }

  const progress = run ? Math.min(1, (run.realTime + run.frame) / run.result.timeRequired) : 0
  const drained = finished || running ? progress : 0
  const color = liquidColor(run?.top ?? setting)

  const filtrateValues: Partial<Record<SoluteId, string>> | null = run
    ? Object.fromEntries(SOLUTES.map((s) => [s, finished ? fix(run.result.filtrate[s] ?? 0, 2) : '----']))
    : null
  const residueValues: Partial<Record<SoluteId, string>> | null =
    run && (analysis === 'running' || analysis === 'done')
      ? Object.fromEntries(
          SOLUTES.map((s) => [
            s,
            analysis === 'running' ? '----' : t(residuePresent(run.top, s) ? 'residue.present' : 'residue.absent')
          ])
        )
      : null

  const headers = ['solute', 'mwco', 'pres', 'filtRate', 'residue', 'startConc', 'filtConc'].map((k) =>
    t(`columns.${k}`)
  )

  return (
    <div className="grid grid-cols-[230px_minmax(0,1fr)_minmax(0,1fr)] gap-3 p-3">
      <ToolbarPortal>
        <ExperimentTools
          lab={t('title')}
          experiment={t('experiments.fl')}
          columns={[]}
          rows={runs}
          printableData={<PrintRuns headers={headers} runs={runs} />}
        />
      </ToolbarPortal>

      <div className="row-span-2 flex flex-col gap-3">
        <Panel>
          <Stepper
            label={t('fields.pressure')}
            display={String(pressure)}
            edit={{
              ...PRESSURE,
              value: pressure,
              onChange: (v) => {
                setPressure(v)
                invalidate()
              }
            }}
            disabled={running}
            canDecrement={pressure > PRESSURE.min}
            canIncrement={pressure < PRESSURE.max}
            onStep={(d) => {
              setPressure((p) => clampStep(p, d, PRESSURE))
              invalidate()
            }}
          />
        </Panel>
        <div className="rounded-xl bg-gradient-to-b from-bench-50/15 to-bench-50/5 p-2">
          <FiltrationApparatus
            top={{ level: full ? 1 - drained : 0, color }}
            bottom={{ level: full ? drained : 0, color: drained > 0 ? '#9fd6d6' : color }}
            membraneColor={mwco !== null ? MEMBRANE_COLORS[mwco] : null}
            onDropMembrane={
              running || analysis === 'due'
                ? undefined
                : (data) => {
                    setMwco(Number(data))
                    invalidate()
                  }
            }
          />
        </div>
      </div>

      <Panel className="flex flex-col gap-3">
        <h3 className="text-center text-sm font-semibold text-bench-100">{t('beaker.top')}</h3>
        <BeakerControls
          solutes={SOLUTES}
          setting={setting}
          unit={t('units.mgml')}
          locked={full || running}
          full={full}
          busy={running}
          canFlush={full && !running && analysis !== 'due' && analysis !== 'running'}
          dispensing={dispensing}
          onChange={(s, v) => {
            setSetting((c) => ({ ...c, [s]: v }))
            invalidate()
          }}
          onDispense={() => {
            setFull(true)
            invalidate()
            setDispensing(true)
            window.setTimeout(() => setDispensing(false), 650)
          }}
          onFlush={flush}
          onDeionized={() => {
            setSetting({})
            invalidate()
          }}
        />
        <TimerPanel
          maxTime={maxTime}
          elapsed={running && run ? run.realTime : null}
          running={running}
          locked={running}
          label={running ? t('actions.stop') : t('actions.start')}
          onChangeTime={(v) => {
            setMaxTime(v)
            invalidate()
          }}
          onStart={start}
        />
      </Panel>

      <Panel className="flex flex-col items-center gap-3">
        <h3 className="text-center text-sm font-semibold text-bench-100">{t('panels.analysis')}</h3>
        <div className="flex items-center gap-2">
          <Light on={analysis === 'running'} />
          <Button onClick={analyze} disabled={analysis !== 'due' || mwco === null}>
            {t('actions.startAnalysis')}
          </Button>
        </div>
        <SoluteValues solutes={SOLUTES} header={t('fields.residue')} values={residueValues} />
        <MembraneRack
          current={mwco}
          onPick={(m) => {
            setMwco((cur) => (cur === m ? null : m))
            invalidate()
          }}
          disabled={running || analysis === 'due' || analysis === 'running'}
          vertical={false}
        />
      </Panel>

      <Panel className="col-span-2 flex flex-col gap-3">
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm font-semibold text-bench-100">{t('fields.filtrationRate')}</span>
          <Readout value={run && finished ? fix(run.result.rate, 2) : ''} />
        </div>
        <SoluteValues solutes={SOLUTES} header={t('fields.filtrateConc')} values={filtrateValues} />
      </Panel>

      <Panel className="col-span-3">
        <RunTable
          headers={headers}
          runs={runs}
          canRecord={recordable && run !== null}
          onRecord={() => {
            if (!run) return
            addRun(
              'fl',
              SOLUTES.map((s) => ({
                solute: s,
                cells: [
                  String(run.mwco),
                  String(run.pressure),
                  fix(run.result.rate, 2),
                  t(residuePresent(run.top, s) ? 'residue.present' : 'residue.absent'),
                  fix(run.top[s] ?? 0, 2),
                  fix(run.result.filtrate[s] ?? 0, 2)
                ]
              }))
            )
            setRecordable(false)
          }}
          onDelete={(n) => deleteRun('fl', n)}
        />
      </Panel>

      {notice && <Notice title={notice.title} lines={notice.lines} onClose={() => setNotice(null)} />}
    </div>
  )
}
