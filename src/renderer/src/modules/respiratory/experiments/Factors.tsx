import { useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { DataTable, type DataColumn } from '@/shared/components/DataTable'
import { ExperimentTools } from '@/shared/components/ExperimentTools'
import { Stepper } from '@/shared/components/Stepper'
import { ToolbarPortal } from '@/shared/components/ToolbarSlot'
import { Button, Light } from '@/shared/components/ui'
import { fixed } from '@/shared/lib/format'
import { useFrameLoop } from '@/shared/lib/useFrameLoop'
import { BellJar, LungScope, RespLayout, ResultCell } from '../components/Bench'
import { FactorsRun, PUMP_RATE, RADIUS, deflate, newLungs, reinflate, type Lungs } from '../model/respiratory'
import { useFactorsStore, type FactorsRow } from '../store'

export function factorsColumns(t: TFunction): DataColumn<FactorsRow>[] {
  const c = (key: keyof FactorsRow, header: string, dec: 0 | 1 | 2): DataColumn<FactorsRow> => ({
    key,
    header: t(`columns.${header}`),
    value: (r) => r[key] as number,
    format: (r) => (dec === 0 ? String(r[key]) : fixed(r[key] as number, dec))
  })
  return [
    c('radius', 'radius', 1),
    c('pumpRate', 'pumpRate', 0),
    c('surfactant', 'surfactant', 0),
    c('pressureL', 'pressureL', 2),
    c('pressureR', 'pressureR', 2),
    c('flowL', 'flowL', 2),
    c('flowR', 'flowR', 2),
    c('totalFlow', 'totalFlow', 2)
  ]
}

/** Experimento 2: radio de la vía aérea, surfactante y neumotórax */
export function Factors(): ReactNode {
  const { t } = useTranslation('respiratory')
  const tc = useTranslation().t
  const s = useFactorsStore()
  const { radius, pumpRate } = s.params
  const [surfactant, setSurfactant] = useState(5)
  const [lungs, setLungs] = useState<Lungs>(newLungs)
  const [valves, setValves] = useState({ L: false, R: false })
  const run = useRef<FactorsRun | null>(null)
  const traceId = useRef(0)
  const [running, setRunning] = useState(false)
  const [last, setLast] = useState<FactorsRow | null>(null)
  const [recorded, setRecorded] = useState<FactorsRow | null>(null)
  const [, setTick] = useState(0)

  const finishRun = (r: FactorsRun): void => {
    setRunning(false)
    setLungs({ ...r.lungs })
    if (r.results) setLast({ radius: r.radius, pumpRate: r.pumpRate, surfactant: r.surfactant, ...r.results })
  }

  useFrameLoop(running, () => {
    const r = run.current
    if (!r) return
    r.step()
    s.updateTrace(traceId.current, [...r.points])
    if (r.done) finishRun(r)
    setTick((n) => n + 1)
  })

  const start = (): void => {
    if (running && run.current) {
      run.current.finish()
      finishRun(run.current)
      return
    }
    run.current = new FactorsRun(radius, pumpRate, surfactant, lungs)
    traceId.current = s.addTrace()
    setLast(null)
    setRunning(true)
  }

  /** con la corrida en marcha, abrir una válvula colapsa el pulmón en ese momento */
  const toggleValve = (side: 'L' | 'R'): void => {
    const open = !valves[side]
    setValves((v) => ({ ...v, [side]: open }))
    if (!open) return
    if (running && run.current) run.current.lungs = deflate(run.current.lungs, side)
    else setLungs((l) => deflate(l, side))
  }

  const r = run.current
  const live = running && r ? r.lungs : lungs
  const res = last
  const columns = factorsColumns(t)
  const scope = (light = false): ReactNode => <LungScope series={s.traces} light={light} />
  const show = (v: number | null | undefined): string => (v === null || v === undefined ? '----' : fixed(v, 2))
  const canReset = (live.deflatedL && !valves.L) || (live.deflatedR && !valves.R)

  return (
    <>
      <ToolbarPortal>
        <ExperimentTools
          lab={t('title')}
          experiment={t('experiments.far')}
          columns={columns}
          rows={s.rows}
          printableGraph={scope(true)}
        />
      </ToolbarPortal>
      <RespLayout
        apparatus={
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-2" title={t('hints.valve')}>
              {(['L', 'R'] as const).map((side) => (
                <Button key={side} onClick={() => toggleValve(side)} className={valves[side] ? 'ring-2 ring-rose-400' : ''}>
                  {side === 'L' ? '◀ ' : '▶ '}
                  {valves[side] ? t('actions.valveOpen') : t('actions.valveClosed')}
                </Button>
              ))}
            </div>
            <BellJar
              scale={running && r ? r.lungScale : 100}
              radius={radius}
              deflatedL={live.deflatedL}
              deflatedR={live.deflatedR}
              surfactant={(surfactant - 5) / 5}
            />
          </div>
        }
        controls={
          <div className="flex flex-wrap items-end justify-around gap-3">
            <div className="flex flex-col gap-2">
              <Button onClick={() => setSurfactant((v) => Math.min(10, v + 1))} disabled={running || surfactant >= 10}>
                {t('actions.surfactant')}
              </Button>
              <Button onClick={() => setSurfactant(5)} disabled={running || surfactant === 5}>
                {t('actions.flush')}
              </Button>
              <Button onClick={() => setLungs((l) => reinflate(l, valves.L, valves.R))} disabled={running || !canReset}>
                {t('actions.reset')}
              </Button>
            </div>
            <Stepper
              label={t('fields.radius')}
              display={fixed(radius, 1)}
              disabled={running}
              edit={{ ...RADIUS, value: radius, onChange: (v) => s.setParams({ radius: v }) }}
            />
            <Stepper
              label={t('fields.pumpRateLong')}
              display={fixed(pumpRate, 1)}
              disabled={running}
              edit={{ ...PUMP_RATE, value: pumpRate, onChange: (v) => s.setParams({ pumpRate: v }) }}
            />
            <div className="flex items-center gap-2">
              <Light on={running} />
              <Button variant="primary" onClick={start}>
                {running ? t('actions.stop') : t('actions.start')}
              </Button>
            </div>
          </div>
        }
        scope={scope()}
        scopeActions={
          <Button className="border border-gray-500 bg-gray-100" onClick={s.clearTraces} disabled={running || s.traces.length === 0}>
            {tc('common.clearTracings')}
          </Button>
        }
        results={
          <div className="grid grid-cols-2 gap-2">
            <ResultCell label={t('fields.flowLeft')} value={running ? show(r?.cycleFlowL) : show(res?.flowL)} />
            <ResultCell label={t('fields.pressureLeft')} value={running ? show(r?.pressL) : show(res?.pressureL)} />
            <ResultCell label={t('fields.flowRight')} value={running ? show(r?.cycleFlowR) : show(res?.flowR)} />
            <ResultCell label={t('fields.pressureRight')} value={running ? show(r?.pressR) : show(res?.pressureR)} />
            <ResultCell
              label={t('fields.totalFlow')}
              value={
                running
                  ? r?.cycleFlowL === null || r?.cycleFlowL === undefined
                    ? '----'
                    : fixed((r.cycleFlowL ?? 0) + (r.cycleFlowR ?? 0), 2)
                  : show(res?.totalFlow)
              }
            />
          </div>
        }
        table={
          <DataTable
            columns={columns}
            rows={s.rows}
            selected={s.selected}
            onSelect={s.select}
            onRecord={() => {
              if (last) s.addRow(last)
              setRecorded(last)
            }}
            onDelete={s.deleteRow}
            onClear={s.clearRows}
            canRecord={!running && last !== null && last !== recorded}
          />
        }
      />
    </>
  )
}
