import { useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ExperimentTools } from '@/shared/components/ExperimentTools'
import { DropperBottle, TestTube } from '@/shared/components/LabGlass'
import { PrintRuns, RunTable } from '@/shared/components/RunTable'
import { Stepper } from '@/shared/components/Stepper'
import { ToolbarPortal } from '@/shared/components/ToolbarSlot'
import { Button, Light, Modal, Notice, Panel, Readout } from '@/shared/components/ui'
import { fixed } from '@/shared/lib/format'
import { useFrameLoop } from '@/shared/lib/useFrameLoop'
import {
  BAPNA_COLORS,
  BENEDICT_COLORS,
  IKI_COLORS,
  REAGENTS,
  TEMPERATURE,
  TIMER,
  TUBES,
  addReagent,
  benedictResult,
  colorLevel,
  emptyTube,
  finalPh,
  ikiResult,
  incubateStep,
  isComplete,
  maxReagents,
  opticalDensity,
  phColor,
  type DigestExperiment,
  type Tube
} from '../model/digestion'
import { useAmylaseRuns, useLipaseRuns, usePepsinRuns } from '../store'

/** frames por minuto de incubación (el original tardaba 1 s real por minuto) */
const FRAMES_PER_MINUTE = 2
/** duración de las animaciones de hervir y congelar */
const TREAT_MS = 1200

const RUNS = { am: useAmylaseRuns, pe: usePepsinRuns, li: useLipaseRuns }

/** Resultados de las pruebas de un tubo después de incubar */
interface Tests {
  /** amilasa: muestra vertida en la gradilla de pruebas, IKI y Benedict */
  poured?: boolean
  iki?: '+' | '-'
  benedictDispensed?: boolean
  benedict?: '+' | '-'
  od?: number
  ph?: number
}

type Phase = 'setup' | 'incubating' | 'testing'

/** Experimentos de digestión: amilasa, pepsina y lipasa */
export function DigestionExperiment({ experiment }: { experiment: DigestExperiment }): ReactNode {
  const { t } = useTranslation('digestion')
  const tc = useTranslation().t
  const runs = RUNS[experiment]()
  const reagents = Object.keys(REAGENTS[experiment])
  const [tubes, setTubes] = useState<(Tube | null)[]>(Array(TUBES).fill(null))
  const [lowered, setLowered] = useState<boolean[]>(Array(TUBES).fill(false))
  const [treating, setTreating] = useState<'boil' | 'freeze' | null>(null)
  const [frozen, setFrozen] = useState<boolean[]>(Array(TUBES).fill(false))
  const [dropper, setDropper] = useState<string | null>(null)
  const [temp, setTemp] = useState(37)
  const [time, setTime] = useState<number>(TIMER.initial)
  const [phase, setPhase] = useState<Phase>('setup')
  const [elapsed, setElapsed] = useState(0)
  const [tests, setTests] = useState<Tests[]>(Array(TUBES).fill({}))
  /** condiciones con que se incubó cada tubo (para la tabla) */
  const incubated = useRef<{ time: number; temp: number; tubes: number[] }>({ time: 0, temp: 37, tubes: [] })
  const [recorded, setRecorded] = useState(false)
  const [alert, setAlert] = useState<string | null>(null)
  const [confirmDispose, setConfirmDispose] = useState(false)
  const frames = useRef(0)

  const placed = tubes.map((tb, i) => (tb ? i : -1)).filter((i) => i >= 0)

  useFrameLoop(phase === 'incubating', () => {
    frames.current += 1
    if (frames.current < FRAMES_PER_MINUTE) return
    frames.current = 0
    if (elapsed >= time) {
      finishIncubation(elapsed)
      return
    }
    setTubes((ts) => ts.map((tb, i) => (tb && incubated.current.tubes.includes(i) ? incubateStep(experiment, tb, temp, elapsed) : tb)))
    setElapsed((e) => e + 1)
  })

  const finishIncubation = (minutes: number): void => {
    incubated.current.time = minutes
    setPhase('testing')
  }

  const clickTube = (i: number): void => {
    const tb = tubes[i]
    if (!tb) {
      if (phase === 'setup') setTubes((ts) => ts.map((x, j) => (j === i ? emptyTube() : x)))
      return
    }
    if (phase !== 'setup' || !dropper) return
    const res = addReagent(experiment, tb, dropper)
    if (!res.ok) {
      setAlert(t(`alerts.${res.reason}`, { name: t(`reagents.${dropper}`) }))
      return
    }
    setTubes((ts) => ts.map((x, j) => (j === i ? res.tube : x)))
  }

  const treat = (kind: 'boil' | 'freeze'): void => {
    const down = placed.filter((i) => lowered[i])
    if (down.length === 0) return setAlert(t('alerts.lowerFirst'))
    if (down.some((i) => !isComplete(experiment, tubes[i] as Tube))) return setAlert(t('alerts.lowerFirst'))
    setTreating(kind)
    window.setTimeout(() => {
      if (kind === 'boil') setTubes((ts) => ts.map((x, j) => (x && down.includes(j) ? { ...x, boiled: true } : x)))
      else setFrozen((f) => f.map((v, j) => v || down.includes(j)))
      setLowered(Array(TUBES).fill(false))
      setTreating(null)
    }, TREAT_MS)
  }

  const incubate = (): void => {
    if (phase === 'incubating') {
      finishIncubation(elapsed)
      return
    }
    if (placed.length === 0) return setAlert(t('alerts.noTubes'))
    const notReady = placed.filter((i) => !isComplete(experiment, tubes[i] as Tube))
    if (notReady.length) return setAlert(t('alerts.notReady', { tubes: notReady.map((i) => i + 1).join(', ') }))
    incubated.current = { time: 0, temp, tubes: placed }
    // el original calculaba una vez al empezar
    setTubes((ts) => ts.map((tb) => (tb ? incubateStep(experiment, tb, temp, 0) : tb)))
    setElapsed(0)
    frames.current = 0
    setLowered(Array(TUBES).fill(false))
    setFrozen(Array(TUBES).fill(false))
    setTests(Array(TUBES).fill({}))
    setRecorded(false)
    setPhase('incubating')
  }

  const patchTest = (i: number, patch: Tests): void => setTests((ts) => ts.map((x, j) => (j === i ? { ...x, ...patch } : x)))

  /** Benedict: se hierven todos los tubos de prueba juntos cuando todos tienen el reactivo */
  const boilBenedict = (): void => {
    const missing = placed.filter((i) => !tests[i].benedictDispensed)
    if (missing.length) return setAlert(t('alerts.benedictFirst', { tubes: missing.map((i) => i + 1).join(', ') }))
    setTreating('boil')
    window.setTimeout(() => {
      setTests((ts) => ts.map((x, j) => (tubes[j] ? { ...x, benedict: benedictResult(tubes[j] as Tube) } : x)))
      setTreating(null)
    }, TREAT_MS)
  }

  const testDone = (i: number): boolean => {
    const x = tests[i]
    if (experiment === 'am') return x.iki !== undefined && x.benedict !== undefined
    if (experiment === 'pe') return x.od !== undefined
    return x.ph !== undefined
  }
  const allTested = phase === 'testing' && placed.length > 0 && placed.every(testDone)

  const dispose = (): void => {
    setTubes(Array(TUBES).fill(null))
    setTests(Array(TUBES).fill({}))
    setLowered(Array(TUBES).fill(false))
    setFrozen(Array(TUBES).fill(false))
    setElapsed(0)
    setPhase('setup')
    setRecorded(false)
  }

  const n = maxReagents(experiment)
  const headers = [
    t('columns.tube'),
    ...Array.from({ length: n }, (_, k) => t('columns.reagent', { n: k + 1 })),
    t('columns.boiled'),
    t('columns.time'),
    t('columns.temp'),
    ...(experiment === 'am' ? [t('columns.iki'), t('columns.benedict')] : experiment === 'pe' ? [t('columns.od')] : [t('columns.ph')])
  ]

  const record = (): void => {
    const { time: tm, temp: tp, tubes: list } = incubated.current
    runs.addRun(
      list.map((i) => {
        const tb = tubes[i] as Tube
        const x = tests[i]
        const res =
          experiment === 'am' ? [x.iki ?? '', x.benedict ?? ''] : experiment === 'pe' ? [fixed(x.od ?? 0)] : [fixed(x.ph ?? 0)]
        return [String(i + 1), ...tb.reagents.map((r) => t(`short.${r}`)), tb.boiled ? '+' : '-', String(tm), String(tp), ...res]
      })
    )
    setRecorded(true)
  }

  const tubeColor = (i: number): string => {
    const tb = tubes[i]
    if (!tb) return '#93c5fd'
    const x = tests[i]
    if (experiment === 'am' && x.benedict !== undefined) return BENEDICT_COLORS[colorLevel(tb.concProduct)]
    if (experiment === 'am' && x.benedictDispensed) return '#0000ff'
    if (experiment === 'pe' && phase === 'testing') return BAPNA_COLORS[colorLevel(tb.concProduct)]
    if (experiment === 'li' && tb.reagents.some((r) => r.startsWith('ph')))
      return phColor(phase === 'testing' ? finalPh(tb) : tb.pH)
    return '#93c5fd'
  }

  const busy = phase === 'incubating' || treating !== null

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_340px] gap-3 p-3">
      <ToolbarPortal>
        <ExperimentTools
          lab={t('title')}
          experiment={t(`experiments.${experiment}`)}
          columns={[]}
          rows={runs.runs}
          printableData={<PrintRuns headers={headers} runs={runs.runs} />}
        />
      </ToolbarPortal>

      <Panel className="flex flex-col gap-3">
        <p className="text-xs text-bench-300">{phase === 'testing' ? t('hints.tests') : t('hints.dropper')}</p>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-2">
          {reagents.map((r) => (
            <DropperBottle
              key={r}
              label={t(`reagents.${r}`)}
              color={r.startsWith('ph') ? phColor(Number(r.slice(2))) : r === 'oil' ? '#b8960a' : '#93c5fd'}
              selected={dropper === r}
              disabled={phase !== 'setup'}
              onClick={() => setDropper(dropper === r ? null : r)}
            />
          ))}
        </div>
        <div className="flex items-end justify-center gap-2 rounded-lg bg-bench-900 p-2">
          {tubes.map((tb, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <TestTube
                number={i + 1}
                placed={tb !== null}
                level={tb ? tb.reagents.length / n : 0}
                color={tubeColor(i)}
                shaking={phase === 'incubating' && incubated.current.tubes.includes(i)}
                selected={lowered[i]}
                onClick={() => clickTube(i)}
                title={tb ? tb.reagents.map((r) => t(`short.${r}`)).join(', ') : t('actions.addTube')}
              />
              {tb && frozen[i] && <span className="text-xs text-sky-300">❄</span>}
              {tb && tb.boiled && <span className="text-xs text-orange-300">♨</span>}
              {phase === 'setup' && tb && (
                <button
                  type="button"
                  onClick={() => setLowered((l) => l.map((v, j) => (j === i ? !v : v)))}
                  disabled={busy}
                  className={`rounded px-1.5 text-xs ${lowered[i] ? 'bg-sky-600 text-white' : 'bg-bench-700 text-bench-100'}`}
                >
                  {t('actions.lower')}
                </button>
              )}
            </div>
          ))}
        </div>
        {phase === 'testing' && renderTests()}
      </Panel>

      <Panel className="flex flex-col gap-3">
        <Stepper
          label={t('fields.temperature')}
          display={String(temp)}
          disabled={phase !== 'setup'}
          edit={{ ...TEMPERATURE[experiment], value: temp, onChange: setTemp }}
        />
        <Stepper
          label={t('fields.timer')}
          display={String(phase === 'incubating' ? time - elapsed : time)}
          disabled={phase !== 'setup'}
          edit={{ ...TIMER, value: time, onChange: setTime }}
        />
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-semibold text-bench-100">{t('fields.elapsed')}</span>
          <Readout value={String(elapsed)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2">
            <Light on={phase === 'incubating'} />
            <Button variant="primary" onClick={incubate} disabled={treating !== null || phase === 'testing'} className="flex-1">
              {phase === 'incubating' ? t('actions.stop') : t('actions.incubate')}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Light on={treating === 'boil'} />
            <Button
              onClick={() => (phase === 'testing' && experiment === 'am' ? boilBenedict() : treat('boil'))}
              disabled={busy || (phase === 'testing' && experiment !== 'am')}
              className="flex-1"
            >
              {t('actions.boil')}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Light on={treating === 'freeze'} />
            <Button onClick={() => treat('freeze')} disabled={busy || phase !== 'setup'} className="flex-1">
              {t('actions.freeze')}
            </Button>
          </div>
          <Button
            onClick={() => (phase === 'testing' && allTested && !recorded ? setConfirmDispose(true) : dispose())}
            disabled={busy || placed.length === 0}
          >
            {t('actions.dispose')}
          </Button>
        </div>
      </Panel>

      <Panel className="col-span-2">
        <RunTable
          headers={headers}
          runs={runs.runs}
          canRecord={allTested && !recorded}
          onRecord={record}
          onDelete={runs.deleteRun}
        />
      </Panel>

      {alert && <Notice title={t('alerts.title')} lines={[alert]} onClose={() => setAlert(null)} />}
      {confirmDispose && (
        <Modal title={t('actions.dispose')} onClose={() => setConfirmDispose(false)}>
          <p className="mb-5 text-bench-100">{t('alerts.disposeSure')}</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmDispose(false)}>
              {tc('common.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                dispose()
                setConfirmDispose(false)
              }}
            >
              {t('actions.dispose')}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )

  /** Pruebas de cada tubo incubado */
  function renderTests(): ReactNode {
    return (
      <div className="overflow-x-auto rounded-lg border border-bench-600">
        <table className="w-full text-sm">
          <tbody>
            {incubated.current.tubes.map((i) => {
              const tb = tubes[i] as Tube
              const x = tests[i]
              return (
                <tr key={i} className="border-t border-bench-700 first:border-t-0">
                  <td className="px-2 py-1 font-mono">#{i + 1}</td>
                  {experiment === 'am' && (
                    <>
                      <td className="px-1 py-1">
                        <Button onClick={() => patchTest(i, { poured: true })} disabled={x.poured}>
                          {t('actions.pour')}
                        </Button>
                      </td>
                      <td className="px-1 py-1">
                        <Button
                          onClick={() => (x.poured ? patchTest(i, { iki: ikiResult(tb) }) : setAlert(t('alerts.pourFirst')))}
                          disabled={x.iki !== undefined}
                        >
                          {t('reagents.iki')}
                        </Button>
                      </td>
                      <td className="px-1 py-1">
                        <span
                          className="inline-block size-5 rounded-full border border-black align-middle"
                          style={{ background: x.iki !== undefined ? IKI_COLORS[colorLevel(tb.concSubstrate)] : 'transparent' }}
                        />
                        <span className="ml-1 font-mono">{x.iki ?? ''}</span>
                      </td>
                      <td className="px-1 py-1">
                        <Button
                          onClick={() =>
                            x.poured ? patchTest(i, { benedictDispensed: true }) : setAlert(t('alerts.pourFirst'))
                          }
                          disabled={x.benedictDispensed}
                        >
                          {t('reagents.benedict')}
                        </Button>
                      </td>
                      <td className="px-1 py-1 font-mono">{x.benedict ?? ''}</td>
                    </>
                  )}
                  {experiment === 'pe' && (
                    <>
                      <td className="px-1 py-1">
                        <Button onClick={() => patchTest(i, { od: Number(fixed(opticalDensity(tb))) })} disabled={x.od !== undefined}>
                          {t('actions.analyze')}
                        </Button>
                      </td>
                      <td className="px-1 py-1 font-mono">{x.od !== undefined ? `${t('fields.od')}: ${fixed(x.od)}` : ''}</td>
                    </>
                  )}
                  {experiment === 'li' && (
                    <>
                      <td className="px-1 py-1">
                        <Button onClick={() => patchTest(i, { ph: Number(fixed(finalPh(tb))) })} disabled={x.ph !== undefined}>
                          {t('actions.measurePh')}
                        </Button>
                      </td>
                      <td className="px-1 py-1 font-mono">{x.ph !== undefined ? `pH ${fixed(x.ph)}` : ''}</td>
                    </>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }
}
