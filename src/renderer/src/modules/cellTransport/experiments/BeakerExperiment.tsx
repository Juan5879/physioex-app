import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { ExperimentTools } from '@/shared/components/ExperimentTools'
import { Stepper } from '@/shared/components/Stepper'
import { ToolbarPortal } from '@/shared/components/ToolbarSlot'
import { Button, Light, Notice, Panel, Readout } from '@/shared/components/ui'
import {
  BeakerPair,
  BUILT_MEMBRANE_COLOR,
  ConcentrationTable,
  fix,
  liquidColor,
  MEMBRANE_COLORS
} from '../components/Apparatus'
import { BeakerControls, clampStep, MembraneRack, PrintRuns, RunTable, SoluteValues, TimerPanel } from '../components/Panels'
import { useMinuteClock } from '../components/useMinuteClock'
import {
  ATP,
  CARRIERS,
  EXPERIMENT_SOLUTES,
  TIMER,
  round3,
  type BeakerExperiment as ExpId,
  type SoluteId
} from '../model/constants'
import { TransportRun, type Conc } from '../model/transport'
import { useRunsStore, type RunRecord } from '../store'

type Side = 'L' | 'R'

interface Beaker {
  /** valores de los controles */
  setting: Conc
  /** concentración actual del vaso */
  conc: Conc
  /** lo que se dispensó (o lo que quedó tras vaciar el otro vaso) */
  start: Conc
  full: boolean
  /** contiene la solución de una corrida anterior */
  stale: boolean
}

const EMPTY: Beaker = { setting: {}, conc: {}, start: {}, full: false, stale: false }

type Status = 'idle' | 'running' | 'paused' | 'done'

/** encabezados de la tabla de corridas (después de "Soluto"), como en el original */
function runHeaders(exp: ExpId, t: TFunction): string[] {
  const c = (k: string): string => t(`columns.${k}`)
  switch (exp) {
    case 'sd':
      return [c('solute'), c('mwco'), c('startL'), c('startR'), c('avgRate')]
    case 'fd':
      return [c('solute'), c('startL'), c('startR'), c('carriers'), c('rate')]
    case 'os':
      return [c('solute'), c('mwco'), c('startL'), c('presL'), c('startR'), c('presR'), c('rate')]
    case 'at':
      return [c('solute'), c('atp'), c('startL'), c('startR'), c('pumps'), c('carriers'), c('rate')]
  }
}

/** Celdas de la corrida registrada (f_addDataSet) */
function recordRows(
  run: TransportRun,
  start: Record<Side, Conc>,
  extra: { atp: number }
): RunRecord['rows'] {
  const { setup } = run
  const osmotic = run.osmoticEquilibrium() ?? true
  return run.solutes.map((s) => {
    const sl = fix(start.L[s] ?? 0, 2)
    const sr = fix(start.R[s] ?? 0, 2)
    const av = run.avRate[s] ?? 0
    const hash = av !== 0 && run.unequal(s) ? '#' : ''
    const rate = fix(av, 4) + hash
    switch (run.experiment) {
      case 'sd':
        return { solute: s, cells: [String(setup.mwco), sl, sr, rate] }
      case 'fd':
        return { solute: s, cells: [sl, sr, s === 'Gluc' ? String(setup.carriers) : '----', rate] }
      case 'os': {
        const present = (start.L[s] ?? 0) !== 0 || (start.R[s] ?? 0) !== 0
        const showPres = av === 0 && present
        const mark = osmotic ? '' : '#'
        return {
          solute: s,
          cells: [
            String(setup.mwco),
            sl,
            showPres ? fix(run.presL, 0) + mark : '----',
            sr,
            showPres ? fix(run.presR, 0) + mark : '----',
            rate
          ]
        }
      }
      case 'at':
        if (s === 'Gluc') return { solute: s, cells: ['----', sl, sr, '----', String(setup.carriers), rate] }
        return {
          solute: s,
          cells: [
            fix(extra.atp, 2),
            sl,
            sr,
            String(setup.pumps),
            '----',
            fix(av, 4) + (av !== 0 && (run.eqlm[s] ?? 0) === 0 ? '#' : '')
          ]
        }
    }
  })
}

/**
 * Experimentos de dos vasos separados por una membrana: difusión simple, difusión facilitada,
 * ósmosis y transporte activo.
 */
export function BeakerExperiment({ experiment }: { experiment: ExpId }): ReactNode {
  const { t } = useTranslation('cellTransport')
  const solutes = EXPERIMENT_SOLUTES[experiment]
  const runs = useRunsStore((s) => s.runs[experiment])
  const addRun = useRunsStore((s) => s.addRun)
  const deleteRun = useRunsStore((s) => s.deleteRun)

  const [beakers, setBeakers] = useState<Record<Side, Beaker>>({ L: EMPTY, R: EMPTY })
  const [maxTime, setMaxTime] = useState(TIMER.initial)
  const [mwco, setMwco] = useState<number | null>(null)
  const [carriers, setCarriers] = useState(CARRIERS.initial)
  const [pumps, setPumps] = useState(CARRIERS.initial)
  const [built, setBuilt] = useState<{ carriers: number; pumps: number } | null>(null)
  const [atpSetting, setAtpSetting] = useState(0)
  /** ATP dispensado y disponible (transporte activo) */
  const [atp, setAtp] = useState<{ dispensed: number; available: number } | null>(null)
  const [run, setRun] = useState<TransportRun | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [, setTick] = useState(0)
  const [recordable, setRecordable] = useState<TransportRun | null>(null)
  const [notice, setNotice] = useState<{ title: string; lines: string[] } | null>(null)
  const [dispensing, setDispensing] = useState<Side | 'atp' | null>(null)

  const usesBuilder = experiment === 'fd' || experiment === 'at'
  const busy = status === 'running' || status === 'paused'
  const membranePlaced = usesBuilder ? built !== null : mwco !== null
  const name = (s: SoluteId): string => t(`solutes.${s}`)

  const invalidate = (): void => setRecordable(null)

  const finish = (r: TransportRun): void => {
    setStatus('done')
    setBeakers((b) => ({ L: { ...b.L, stale: true }, R: { ...b.R, stale: true } }))
    setRecordable(r)
    const lines = r.outcomes().map((o) =>
      t(`messages.${o.kind}`, { solute: name(o.solute), time: 'time' in o ? o.time : '' })
    )
    const osmotic = r.osmoticEquilibrium()
    if (osmotic !== null) lines.push(t(osmotic ? 'messages.osmoticReached' : 'messages.osmoticNotReached'))
    setNotice({ title: t('messages.results'), lines: lines.length ? lines : [t('messages.noSolute')] })
  }

  useMinuteClock(status === 'running', () => {
    if (!run) return
    if (!run.tick()) {
      finish(run)
      return
    }
    setBeakers((b) => ({ L: { ...b.L, conc: { ...run.left } }, R: { ...b.R, conc: { ...run.right } } }))
    if (experiment === 'at') setAtp((a) => (a ? { ...a, available: run.atp } : a))
    setTick((n) => n + 1)
  })

  const start = (): void => {
    if (status === 'running') {
      // "Pausa" termina la corrida si ya no se mueve ningún soluto
      if (run && !run.anyDiffusion) finish(run)
      else setStatus('paused')
      return
    }
    if (status === 'paused') {
      setStatus('running')
      return
    }
    const { L, R } = beakers
    const lines: string[] = []
    if (L.stale && R.stale) lines.push(t('messages.bothStale'))
    else {
      if (!L.full) lines.push(t(R.full ? 'messages.leftEmpty' : 'messages.bothEmpty'))
      else if (!R.full) lines.push(t('messages.rightEmpty'))
      if (!membranePlaced) lines.push(t('messages.noMembrane'))
    }
    if (lines.length) {
      setNotice({ title: t('messages.title'), lines })
      return
    }
    const r = new TransportRun({
      experiment,
      left: L.conc,
      right: R.conc,
      startLeft: L.start,
      startRight: R.start,
      maxTime,
      mwco: mwco ?? undefined,
      carriers: built?.carriers,
      pumps: built?.pumps,
      atp: atp?.available ?? 0
    })
    setRun(r)
    invalidate()
    setStatus('running')
  }

  const dispense = (side: Side): void => {
    const setting = beakers[side].setting
    setBeakers((b) => ({ ...b, [side]: { setting, conc: { ...setting }, start: { ...setting }, full: true, stale: false } }))
    invalidate()
    setDispensing(side)
    window.setTimeout(() => setDispensing(null), 650)
  }

  const flush = (side: Side): void => {
    invalidate()
    setRun(null)
    setStatus('idle')
    if (experiment === 'at') {
      // en transporte activo se vacían los dos vasos y el ATP
      setBeakers({ L: EMPTY, R: EMPTY })
      setAtp(null)
      return
    }
    setBeakers((b) => {
      const other: Side = side === 'L' ? 'R' : 'L'
      const o = b[other]
      // el otro vaso conserva su solución; sus controles muestran la concentración actual
      const kept: Conc = {}
      for (const s of solutes) kept[s] = Math.round((o.conc[s] ?? 0) * 100) / 100
      return {
        ...b,
        [side]: EMPTY,
        [other]: o.full ? { ...o, setting: kept, start: kept } : o
      } as Record<Side, Beaker>
    })
  }

  const setSetting = (side: Side, s: SoluteId, v: number): void => {
    setBeakers((b) => ({ ...b, [side]: { ...b[side], setting: { ...b[side].setting, [s]: v } } }))
    invalidate()
  }

  /** Agua desionizada: todos los controles del vaso a cero */
  const deionized = (side: Side): void => {
    setBeakers((b) => ({ ...b, [side]: { ...b[side], setting: {} } }))
    invalidate()
  }

  const pickMembrane = (m: number): void => {
    setMwco((cur) => (cur === m ? null : m))
    invalidate()
  }

  const showRates = run && status !== 'idle'
  const rateValues: Partial<Record<SoluteId, string>> | null = showRates
    ? Object.fromEntries(solutes.map((s) => [s, status === 'running' ? '----' : fix(run.avRate[s] ?? 0, 4)]))
    : null

  const headers = runHeaders(experiment, t)
  const membraneColor = usesBuilder
    ? built
      ? BUILT_MEMBRANE_COLOR
      : null
    : mwco !== null
      ? MEMBRANE_COLORS[mwco]
      : null
  const startLabel =
    status === 'running' ? t('actions.pause') : status === 'paused' ? t('actions.resume') : t('actions.start')

  const side = (s: Side): ReactNode => {
    const b = beakers[s]
    return (
      <Panel className="flex flex-col gap-3">
        <h3 className="text-center text-sm font-semibold text-bench-100">
          {t(s === 'L' ? 'beaker.left' : 'beaker.right')}
        </h3>
        <ConcentrationTable solutes={solutes} values={b.full ? b.conc : null} unit={t('units.mM')} />
        <BeakerControls
          solutes={solutes}
          setting={b.setting}
          unit={t('units.mM')}
          locked={b.full || busy}
          full={b.full}
          busy={busy}
          canFlush={b.full && status !== 'running'}
          dispensing={dispensing === s}
          onChange={(sol, v) => setSetting(s, sol, v)}
          onDispense={() => dispense(s)}
          onFlush={() => flush(s)}
          onDeionized={() => deionized(s)}
        />
      </Panel>
    )
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)_minmax(0,1fr)_190px] gap-3 p-3">
      <ToolbarPortal>
        <ExperimentTools
          lab={t('title')}
          experiment={t(`experiments.${experiment}`)}
          columns={[]}
          rows={runs}
          printableData={<PrintRuns headers={headers} runs={runs} />}
        />
      </ToolbarPortal>

      {side('L')}

      <div className="flex min-w-0 flex-col gap-3">
        {experiment === 'os' && (
          <div className="flex justify-between gap-3">
            {(['presL', 'presR'] as const).map((k) => (
              <div key={k} className="flex items-center gap-2">
                <Readout value={showRates ? String(k === 'presL' ? run.presL : run.presR) : ''} />
                <span className="text-sm font-semibold whitespace-nowrap">{t('fields.pressure')}</span>
              </div>
            ))}
          </div>
        )}
        {experiment === 'at' && (
          <Panel className="flex flex-wrap items-end justify-center gap-3">
            <Stepper
              label={t('fields.atp')}
              display={fix(atpSetting, 2)}
              edit={{
                ...ATP,
                value: atpSetting,
                onChange: (v) => {
                  setAtpSetting(v)
                  invalidate()
                }
              }}
              disabled={atp !== null || busy}
              canDecrement={atpSetting > ATP.min}
              canIncrement={atpSetting < ATP.max}
              onStep={(d) => {
                setAtpSetting((v) => clampStep(v, d, ATP))
                invalidate()
              }}
            />
            <div className="flex items-center gap-2 pb-0.5">
              <Light on={dispensing === 'atp'} />
              <Button
                onClick={() => {
                  setAtp({ dispensed: atpSetting, available: round3(atpSetting) })
                  setDispensing('atp')
                  window.setTimeout(() => setDispensing(null), 650)
                }}
                disabled={!(beakers.L.full && beakers.R.full) || atp !== null || atpSetting <= 0 || busy}
              >
                {t('actions.dispenseAtp')}
              </Button>
            </div>
          </Panel>
        )}
        <div className="rounded-xl bg-gradient-to-b from-bench-50/15 to-bench-50/5 p-2">
          <BeakerPair
            left={{ level: beakers.L.full ? 1 : 0, color: liquidColor(beakers.L.conc) }}
            right={{ level: beakers.R.full ? 1 : 0, color: liquidColor(beakers.R.conc) }}
            membraneColor={membraneColor}
            running={status === 'running'}
            onDropMembrane={
              usesBuilder || busy
                ? undefined
                : (data) => {
                    setMwco(Number(data))
                    invalidate()
                  }
            }
            onHolderClick={!usesBuilder && !busy && mwco !== null ? () => pickMembrane(mwco) : undefined}
          />
        </div>
        <Panel className="flex flex-col gap-3">
          <SoluteValues
            solutes={solutes}
            header={t(experiment === 'sd' ? 'fields.avgRate' : 'fields.rate')}
            values={rateValues}
          />
          {experiment === 'at' && (
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm font-semibold text-bench-100">{t('fields.availableAtp')}</span>
              <Readout value={atp ? fix(atp.available, 3) : ''} />
            </div>
          )}
          <TimerPanel
            maxTime={maxTime}
            elapsed={busy && run ? run.realTime : null}
            running={status === 'running'}
            locked={busy}
            label={startLabel}
            onChangeTime={(v) => {
              setMaxTime(v)
              invalidate()
            }}
            onStart={start}
          />
        </Panel>
      </div>

      {side('R')}

      <Panel className="flex flex-col items-center gap-3">
        {usesBuilder ? (
          <MembraneBuilder
            withPumps={experiment === 'at'}
            carriers={carriers}
            pumps={pumps}
            built={built}
            disabled={busy}
            onCarriers={(v) => {
              setCarriers(v)
              invalidate()
            }}
            onPumps={(v) => {
              setPumps(v)
              invalidate()
            }}
            onBuild={() => {
              setBuilt({ carriers, pumps })
              invalidate()
            }}
            onRemove={() => {
              setBuilt(null)
              invalidate()
            }}
          />
        ) : (
          <MembraneRack current={mwco} onPick={pickMembrane} disabled={busy} />
        )}
      </Panel>

      <Panel className="col-span-4">
        <RunTable
          headers={headers}
          runs={runs}
          canRecord={recordable !== null && status === 'done'}
          onRecord={() => {
            if (!recordable) return
            addRun(
              experiment,
              recordRows(recordable, { L: beakers.L.start, R: beakers.R.start }, { atp: atp?.dispensed ?? 0 })
            )
            setRecordable(null)
          }}
          onDelete={(n) => deleteRun(experiment, n)}
        />
      </Panel>

      {notice && <Notice title={notice.title} lines={notice.lines} onClose={() => setNotice(null)} />}
    </div>
  )
}

/** Constructor de membrana: número de transportadores (y bombas) y "Construir membrana" */
function MembraneBuilder({
  withPumps,
  carriers,
  pumps,
  built,
  disabled,
  onCarriers,
  onPumps,
  onBuild,
  onRemove
}: {
  withPumps: boolean
  carriers: number
  pumps: number
  built: { carriers: number; pumps: number } | null
  disabled: boolean
  onCarriers: (v: number) => void
  onPumps: (v: number) => void
  onBuild: () => void
  onRemove: () => void
}): ReactNode {
  const { t } = useTranslation('cellTransport')
  const locked = disabled || built !== null
  return (
    <div className="flex flex-col items-center gap-3">
      <h3 className="text-center text-sm font-semibold text-bench-100">{t('panels.builder')}</h3>
      <svg viewBox="0 0 80 110" className="w-20">
        <rect x={30} y={5} width={20} height={100} rx={5} fill={built ? '#64748b' : BUILT_MEMBRANE_COLOR} />
        {Array.from({ length: 6 }, (_, i) => (
          <g key={i} fill="#334155">
            <circle cx={i % 2 ? 50 : 30} cy={18 + i * 15} r={4} />
          </g>
        ))}
      </svg>
      <Stepper
        label={t('fields.carriers')}
        display={String(carriers)}
        edit={{ ...CARRIERS, value: carriers, onChange: onCarriers }}
        disabled={locked}
        canDecrement={carriers > CARRIERS.min}
        canIncrement={carriers < CARRIERS.max}
        onStep={(d) => onCarriers(clampStep(carriers, d, CARRIERS))}
      />
      {withPumps && (
        <Stepper
          label={t('fields.pumps')}
          display={String(pumps)}
          edit={{ ...CARRIERS, value: pumps, onChange: onPumps }}
          disabled={locked}
          canDecrement={pumps > CARRIERS.min}
          canIncrement={pumps < CARRIERS.max}
          onStep={(d) => onPumps(clampStep(pumps, d, CARRIERS))}
        />
      )}
      {built ? (
        <>
          <p className="text-center text-xs text-bench-300">
            {withPumps
              ? t('messages.builtMembranePumps', built)
              : t('messages.builtMembrane', built)}
          </p>
          <Button onClick={onRemove} disabled={disabled}>
            {t('actions.remove')}
          </Button>
        </>
      ) : (
        <Button variant="primary" onClick={onBuild} disabled={disabled}>
          {t('actions.build')}
        </Button>
      )}
    </div>
  )
}
