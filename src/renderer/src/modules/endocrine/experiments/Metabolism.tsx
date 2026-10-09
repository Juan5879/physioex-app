import { useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import type { DataColumn } from '@/shared/components/DataTable'
import { DataSetTable, PrintDataSets } from '@/shared/components/DataSetTable'
import { ExperimentTools } from '@/shared/components/ExperimentTools'
import { Stepper } from '@/shared/components/Stepper'
import { ToolbarPortal } from '@/shared/components/ToolbarSlot'
import { Button, Light, Notice, Panel, Readout } from '@/shared/components/ui'
import { fixed } from '@/shared/lib/format'
import { useFrameLoop } from '@/shared/lib/useFrameLoop'
import { RatFigure, Syringe } from '../components/Figures'
import {
  HORMONES,
  METABOLISM_TIMER_MAX,
  O2_SYRINGE,
  RATS,
  SECONDS_PER_FRAME,
  clock,
  oxygenUsed,
  ratWeight,
  type Hormone,
  type Rat
} from '../model/endocrine'
import { useMetabolismSets, type MetabolismRow } from '../store'

export function metabolismColumns(t: TFunction): DataColumn<MetabolismRow>[] {
  return [
    { key: 'weight', header: t('columns.weight'), value: (r) => r.weight, format: (r) => fixed(r.weight, 1) },
    { key: 'elapsed', header: t('columns.elapsed'), value: (r) => r.elapsed / 60, format: (r) => clock(r.elapsed) },
    { key: 'o2', header: t('columns.o2'), value: (r) => r.o2, format: (r) => fixed(r.o2, 1) },
    { key: 'hormone', header: t('columns.injected'), value: () => NaN, format: (r) => t(`hormones.${r.hormone}`) }
  ]
}

const round1 = (v: number): number => Math.round(v * 10) / 10

/** Experimento 1: tasa metabólica (consumo de O₂) y hormonas tiroideas */
export function Metabolism(): ReactNode {
  const { t } = useTranslation('endocrine')
  const sets = useMetabolismSets()
  const [inChamber, setInChamber] = useState<Rat | null>(null)
  const [injected, setInjected] = useState<{ rat: Rat; hormone: Hormone } | null>(null)
  const [syringe, setSyringe] = useState<Hormone | null>(null)
  const [weight, setWeight] = useState(0)
  const [timer, setTimer] = useState(0)
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [clampOpen, setClampOpen] = useState(true)
  /** conector en T: cámara–manómetro (true) o manómetro–jeringa (false) */
  const [tChamber, setTChamber] = useState(true)
  const [manoUsed, setManoUsed] = useState(0)
  const [o2Amount, setO2Amount] = useState(0)
  const [level, setLevel] = useState(0)
  const [injecting, setInjecting] = useState(false)
  const [recordable, setRecordable] = useState(false)
  const [alert, setAlert] = useState<string | null>(null)
  const usage = useRef(0)

  const hormoneOf = (rat: Rat): Hormone => (injected?.rat === rat ? injected.hormone : 'none')

  useFrameLoop(running || injecting, () => {
    if (running) {
      if (elapsed < timer) {
        setElapsed((e) => round1(e + SECONDS_PER_FRAME))
      } else {
        setRunning(false)
        setRecordable(true)
        setAlert('switchT')
      }
      if (!clampOpen && inChamber) {
        usage.current = round1(usage.current + SECONDS_PER_FRAME)
        // con el conector en la cámara el manómetro muestra el O₂ consumido
        if (tChamber) setManoUsed(oxygenUsed(inChamber, hormoneOf(inChamber), usage.current))
      }
    }
    if (injecting) {
      setLevel((l) => {
        const next = round1(l + 0.1)
        if (next >= o2Amount) setInjecting(false)
        return Math.min(next, o2Amount)
      })
    }
  })

  /** con la pinza y el conector abiertos la cámara se ventila y el consumo vuelve a cero */
  const vent = (clamp: boolean, tc: boolean): void => {
    if (clamp && tc) {
      usage.current = 0
      setManoUsed(0)
    }
  }

  const moveRat = (rat: Rat): void => {
    if (running) return
    if (inChamber === rat) {
      setInChamber(null)
      return
    }
    if (inChamber || (injected && injected.rat !== rat)) return
    setInChamber(rat)
    sets.selectSet(RATS.indexOf(rat))
  }

  const inject = (rat: Rat): void => {
    if (!syringe) return
    if (injected) {
      setAlert('cleanRat')
      return
    }
    setInjected({ rat, hormone: syringe })
    setSyringe(null)
  }

  const clean = (rat: Rat): void => {
    if (running) return
    if (inChamber === rat) setInChamber(null)
    setInjected(null)
    setSyringe(null)
  }

  const resetO2 = (): void => {
    setO2Amount(0)
    setLevel(0)
    setInjecting(false)
  }

  const resetApparatus = (): void => {
    if (running) return
    setInChamber(null)
    setInjected(null)
    setSyringe(null)
    setWeight(0)
    setTimer(0)
    setElapsed(0)
    setClampOpen(true)
    setTChamber(true)
    usage.current = 0
    setManoUsed(0)
    resetO2()
    setRecordable(false)
  }

  const diff = round1(manoUsed - level)
  const columns = metabolismColumns(t)
  const label = (name: string): string => t(`sets.${name}`)

  return (
    <div className="grid grid-cols-[170px_minmax(0,1fr)_300px] gap-3 p-3">
      <ToolbarPortal>
        <ExperimentTools
          lab={t('title')}
          experiment={t('experiments.m')}
          columns={columns}
          rows={sets.sets.flatMap((s) => s.rows)}
          printableData={<PrintDataSets sets={sets.sets} columns={columns} label={label} />}
        />
      </ToolbarPortal>

      <Panel className="flex flex-col gap-2">
        <span className="text-center text-sm font-semibold text-bench-100">{t('panels.syringe')}</span>
        {HORMONES.map((h) => (
          <Syringe
            key={h}
            label={t(`hormones.${h}`)}
            selected={syringe === h}
            disabled={running || inChamber !== null}
            onClick={() => (injected ? setAlert('cleanRat') : setSyringe(syringe === h ? null : h))}
          />
        ))}
        {syringe && <p className="text-center text-xs text-sky-300">{t('alerts.pickRat')}</p>}
      </Panel>

      <Panel className="flex flex-col gap-3">
        <p className="text-xs text-bench-300">{t('hints.metabolism')}</p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Chamber rat={inChamber} breathing={running} label={inChamber ? t(`rats.${inChamber}`) : t('panels.chamber')} />
          <Manometer diff={diff} label={t('panels.manometer')} equal={t('levelEqual')} off={t('levelOff')} />
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => {
                setClampOpen(!clampOpen)
                vent(!clampOpen, tChamber)
              }}
              className={clampOpen ? '' : 'ring-2 ring-sky-400'}
            >
              {clampOpen ? t('actions.clampOpen') : t('actions.clampClosed')}
            </Button>
            <Button
              onClick={() => {
                setTChamber(!tChamber)
                vent(clampOpen, !tChamber)
              }}
              disabled={injecting}
              className="max-w-52 whitespace-normal"
            >
              {tChamber ? t('actions.tChamber') : t('actions.tSyringe')}
            </Button>
          </div>
        </div>
      </Panel>

      <Panel className="flex flex-col gap-2">
        {RATS.map((rat) => {
          const away = inChamber === rat
          const blocked = injected !== null && injected.rat !== rat
          return (
            <div key={rat} className="flex items-center gap-2 rounded-lg border border-bench-500 bg-bench-900 p-1.5">
              <button
                type="button"
                onClick={() => (syringe ? inject(rat) : moveRat(rat))}
                disabled={running || (blocked && !syringe)}
                title={away ? t('actions.toCage') : t('actions.toChamber')}
                className="flex min-w-0 flex-1 items-center gap-2 text-left text-xs font-semibold disabled:opacity-40"
              >
                <span className={away ? 'opacity-20' : ''}>
                  <RatFigure small />
                </span>
                <span>
                  {t(`rats.${rat}`)}
                  {injected?.rat === rat && <span className="block text-xs text-sky-300">{t(`hormones.${injected.hormone}`)}</span>}
                </span>
              </button>
              <Button onClick={() => clean(rat)} disabled={running || injected?.rat !== rat}>
                {t('actions.clean')}
              </Button>
            </div>
          )
        })}
      </Panel>

      <Panel className="col-span-3 flex flex-wrap items-end justify-around gap-4">
        <div className="flex items-end gap-3">
          <Stepper
            label={t('fields.timer')}
            display={clock(timer)}
            disabled={running}
            edit={{
              min: 0,
              max: METABOLISM_TIMER_MAX / 60,
              step: 1 / 60,
              value: timer / 60,
              onChange: (v) => setTimer(Math.round(v * 60))
            }}
          />
          <div className="flex items-center gap-2 pb-0.5">
            <Light on={running} />
            <Button
              variant="primary"
              disabled={running || !inChamber || timer <= 0}
              onClick={() => {
                setElapsed(0)
                setRecordable(false)
                setRunning(true)
              }}
            >
              {t('actions.start')}
            </Button>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-sm font-semibold text-bench-100">{t('fields.elapsed')}</span>
            <Readout value={clock(elapsed)} />
          </div>
        </div>
        <div className="flex items-end gap-3">
          <Stepper
            label={t('fields.o2')}
            display={fixed(o2Amount, 1)}
            disabled={running || injecting}
            edit={{ ...O2_SYRINGE, value: o2Amount, onChange: setO2Amount }}
          />
          <Button onClick={() => setInjecting(true)} disabled={tChamber || injecting || o2Amount <= 0 || level >= o2Amount}>
            {t('actions.inject')}
          </Button>
          <Button onClick={resetO2} disabled={injecting}>
            {t('actions.reset')}
          </Button>
        </div>
        <div className="flex items-end gap-3">
          <div className="flex flex-col items-center gap-1">
            <span className="text-sm font-semibold text-bench-100">{t('fields.weight')}</span>
            <Readout value={weight ? fixed(weight, 1) : '0'} />
          </div>
          <Button onClick={() => inChamber && setWeight(ratWeight(inChamber))} disabled={!inChamber || weight !== 0}>
            {t('actions.weigh')}
          </Button>
          <Button onClick={() => setWeight(0)} disabled={weight === 0}>
            {t('actions.clear')}
          </Button>
        </div>
        <Button onClick={resetApparatus} disabled={running}>
          {t('actions.resetApparatus')}
        </Button>
      </Panel>

      <Panel className="col-span-3">
        <DataSetTable
          store={sets}
          columns={columns}
          label={label}
          canRecord={recordable && inChamber !== null}
          onRecord={() => {
            if (!inChamber) return
            sets.addRow({ weight, elapsed, o2: o2Amount, hormone: hormoneOf(inChamber) }, RATS.indexOf(inChamber))
            setRecordable(false)
          }}
        />
      </Panel>

      {alert && <Notice title={t('alerts.title')} lines={[t(`alerts.${alert}`)]} onClose={() => setAlert(null)} />}
    </div>
  )
}

/** Campana de vidrio con la rata */
function Chamber({ rat, breathing, label }: { rat: Rat | null; breathing: boolean; label: string }): ReactNode {
  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 180 150" className="w-48">
        <path d="M 20 140 V 50 Q 20 15 90 15 Q 160 15 160 50 V 140 Z" fill="#e0f2fe" fillOpacity={0.15} stroke="#cbd5e1" strokeWidth={2} />
        <rect x={70} y={5} width={40} height={14} rx={3} fill="#111827" />
        <rect x={15} y={138} width={150} height={8} rx={2} fill="#374151" />
        <rect x={30} y={110} width={120} height={6} fill="#9ca3af" />
        {rat && (
          <g transform="translate(45 60)" className={breathing ? 'animate-pulse' : ''}>
            <RatFigure />
          </g>
        )}
      </svg>
      <span className="text-sm font-semibold text-bench-100">{label}</span>
    </div>
  )
}

/** Manómetro en U: la diferencia de niveles es O₂ consumido − O₂ inyectado */
function Manometer({ diff, label, equal, off }: { diff: number; label: string; equal: string; off: string }): ReactNode {
  const d = Math.max(-40, Math.min(40, diff * 2.5))
  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 80 150" className="w-20">
        <path d="M 20 10 V 120 Q 20 140 40 140 Q 60 140 60 120 V 10" fill="none" stroke="#cbd5e1" strokeWidth={10} strokeLinecap="round" />
        <path
          d={`M 20 ${75 - d} V 120 Q 20 140 40 140 Q 60 140 60 120 V ${75 + d}`}
          fill="none"
          stroke="#60a5fa"
          strokeWidth={6}
        />
        <line x1={10} x2={70} y1={75} y2={75} stroke="#9ca3af" strokeDasharray="3 3" />
      </svg>
      <span className="text-sm font-semibold text-bench-100">{label}</span>
      <span className={`text-xs ${diff === 0 ? 'text-lime-300' : 'text-bench-300'}`}>{diff === 0 ? equal : off}</span>
    </div>
  )
}
