import { useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import type { DataColumn } from '@/shared/components/DataTable'
import { DataSetTable, PrintDataSets } from '@/shared/components/DataSetTable'
import { ExperimentTools } from '@/shared/components/ExperimentTools'
import { Stepper } from '@/shared/components/Stepper'
import { ToolbarPortal } from '@/shared/components/ToolbarSlot'
import { Button, Field, Hint, Light, Notice, Panel, Readout } from '@/shared/components/ui'
import { fixed, splitUnit } from '@/shared/lib/format'
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
    <>
      <ToolbarPortal>
        <ExperimentTools
          lab={t('title')}
          experiment={t('experiments.m')}
          columns={columns}
          rows={sets.sets.flatMap((s) => s.rows)}
          printableData={<PrintDataSets sets={sets.sets} columns={columns} label={label} />}
        />
      </ToolbarPortal>

      <div className="grid grid-cols-[200px_minmax(0,1fr)_300px] items-start gap-4">
      <Panel title={t('panels.syringes')} bodyClassName="!gap-2">
        {HORMONES.map((h) => (
          <Syringe
            key={h}
            label={t(`hormones.${h}`)}
            selected={syringe === h}
            disabled={running || inChamber !== null}
            onClick={() => (injected ? setAlert('cleanRat') : setSyringe(syringe === h ? null : h))}
          />
        ))}
        {syringe && <Hint>{t('alerts.pickRat')}</Hint>}
      </Panel>

      <Panel
        title={t('panels.apparatus')}
        actions={<Light on={inChamber !== null} label={inChamber ? t(`rats.${inChamber}`) : t('panels.chamberEmpty')} />}
      >
        <Hint>{t('hints.metabolism')}</Hint>
        <div className="grid grid-cols-[minmax(0,1fr)_200px] items-center gap-4">
          <div className="px-well flex items-end justify-center gap-6 p-4">
            <Chamber rat={inChamber} breathing={running} label={t('panels.chamber')} />
            <Manometer diff={diff} label={t('panels.manometer')} />
          </div>
          <div className="grid gap-3">
            <Field label={t('fields.clamp')}>
              <Button
                block
                aria-pressed={clampOpen}
                onClick={() => {
                  setClampOpen(!clampOpen)
                  vent(!clampOpen, tChamber)
                }}
              >
                {clampOpen ? t('actions.clampOpen') : t('actions.clampClosed')}
              </Button>
            </Field>
            <Field label={t('fields.tConnector')}>
            <Button
              block
              onClick={() => {
                setTChamber(!tChamber)
                vent(clampOpen, !tChamber)
              }}
              disabled={injecting}
              className="!h-auto min-h-[var(--control-height)] !whitespace-normal py-1.5"
            >
              {tChamber ? t('actions.tChamber') : t('actions.tSyringe')}
            </Button>
            </Field>
            <Light on={diff === 0} label={diff === 0 ? t('panels.manometerEqual') : t('panels.manometerOff')} />
          </div>
        </div>
      </Panel>

      <Panel title={t('panels.subjects')} bodyClassName="!gap-2">
        {RATS.map((rat) => {
          const away = inChamber === rat
          const blocked = injected !== null && injected.rat !== rat
          return (
            <div key={rat} className="flex items-stretch gap-2">
              <button
                type="button"
                onClick={() => (syringe ? inject(rat) : moveRat(rat))}
                disabled={running || (blocked && !syringe)}
                title={away ? t('actions.toCage') : t('actions.toChamber')}
                aria-pressed={away}
                className="px-reagent min-w-0 flex-1 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <span className={away ? 'opacity-20' : ''}>
                  <RatFigure small />
                </span>
                <span>
                  {t(`rats.${rat}`)}
                  {injected?.rat === rat && <small>{t(`hormones.${injected.hormone}`)}</small>}
                </span>
              </button>
              <Button size="sm" className="!h-auto" onClick={() => clean(rat)} disabled={running || injected?.rat !== rat}>
                {t('actions.clean')}
              </Button>
            </div>
          )
        })}
      </Panel>

      </div>

      <Panel title={t('panels.controls')} bodyClassName="!flex flex-wrap items-end gap-x-6 gap-y-4">
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
          <div className="flex h-[34px] items-center gap-3">
            <Light on={running} label="" />
            <Button
              variant="primary"
              icon="play"
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
          <Field label={splitUnit(t('fields.elapsed'))?.text ?? t('fields.elapsed')}>
            <Readout value={clock(elapsed)} unit={splitUnit(t('fields.elapsed'))?.unit} />
          </Field>
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
          <Field label={splitUnit(t('fields.weight'))?.text ?? t('fields.weight')}>
            <Readout value={weight ? fixed(weight, 1) : ''} unit={splitUnit(t('fields.weight'))?.unit} />
          </Field>
          <Button onClick={() => inChamber && setWeight(ratWeight(inChamber))} disabled={!inChamber || weight !== 0}>
            {t('actions.weigh')}
          </Button>
          <Button onClick={() => setWeight(0)} disabled={weight === 0}>
            {t('actions.clear')}
          </Button>
        </div>
        <Button variant="ghost" className="ml-auto" onClick={resetApparatus} disabled={running}>
          {t('actions.resetApparatus')}
        </Button>
      </Panel>

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

      {alert && <Notice title={t('alerts.title')} lines={[t(`alerts.${alert}`)]} onClose={() => setAlert(null)} />}
    </>
  )
}

/** Campana de vidrio con la rata */
function Chamber({ rat, breathing, label }: { rat: Rat | null; breathing: boolean; label: string }): ReactNode {
  return (
    <div className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 180 150" className="w-48">
        <path className="il-glass" d="M 20 140 V 50 Q 20 15 90 15 Q 160 15 160 50 V 140 Z" />
        <rect className="il-glass" x={70} y={5} width={40} height={14} rx={3} />
        <rect className="il-metal" x={15} y={138} width={150} height={6} rx={3} />
        <line className="il-thin" x1={36} x2={144} y1={112} y2={112} />
        {rat && (
          <g transform="translate(45 60)" className={breathing ? 'animate-pulse' : ''}>
            <RatFigure />
          </g>
        )}
      </svg>
      <span className="il-label text-[11px] uppercase">{label}</span>
    </div>
  )
}

/** Manómetro en U: la diferencia de niveles es O₂ consumido − O₂ inyectado */
function Manometer({ diff, label }: { diff: number; label: string }): ReactNode {
  const d = Math.max(-40, Math.min(40, diff * 2.5))
  return (
    <div className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 80 150" className="w-20">
        <path
          d="M 20 10 V 120 Q 20 140 40 140 Q 60 140 60 120 V 10"
          fill="none"
          stroke="var(--border-strong)"
          strokeWidth={12}
          strokeLinecap="round"
        />
        <path
          d="M 20 10 V 120 Q 20 140 40 140 Q 60 140 60 120 V 10"
          fill="none"
          stroke="var(--surface-raised)"
          strokeWidth={8}
          strokeLinecap="round"
        />
        <path
          className="il-liquid-stroke"
          d={`M 20 ${75 - d} V 120 Q 20 140 40 140 Q 60 140 60 120 V ${75 + d}`}
          strokeWidth={8}
          strokeLinecap="butt"
        />
        <line className="il-mark" x1={6} x2={74} y1={75} y2={75} />
      </svg>
      <span className="il-label text-[11px] uppercase">{label}</span>
    </div>
  )
}
