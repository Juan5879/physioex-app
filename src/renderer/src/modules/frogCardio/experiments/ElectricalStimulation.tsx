import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Stepper } from '@/shared/components/Stepper'
import { ToolbarPortal } from '@/shared/components/ToolbarSlot'
import { Button, Light, Panel, Readout } from '@/shared/components/ui'
import { FrogHeartFigure, HeartMonitor, ModifyDisplay, useFrogHeart } from '../components/Bench'

type Probe = 'probe1' | 'probe2'

/** voltaje fijo y estímulos/s (inicial y máximo) de cada electrodo (f_probeRelease, f_scroll) */
const PROBES: Record<Probe, { voltage: number; rate: number; max: number }> = {
  probe1: { voltage: 20, rate: 20, max: 20 },
  probe2: { voltage: 1, rate: 50, max: 50 }
}

/** Experimento 1: periodo refractario, extrasístoles, sumación y estimulación vagal */
export function ElectricalStimulation(): ReactNode {
  const { t } = useTranslation('frogCardio')
  const heart = useFrogHeart('es')
  const [probe, setProbe] = useState<Probe | null>(null)
  const [stimRate, setStimRate] = useState(20)
  const [multi, setMulti] = useState(false)
  const [spark, setSpark] = useState(false)

  const flash = (): void => {
    setSpark(true)
    window.setTimeout(() => setSpark(false), 250)
  }

  const pickProbe = (p: Probe): void => {
    if (multi) return
    if (probe === p) {
      setProbe(null)
      return
    }
    if (probe) return
    setProbe(p)
    setStimRate(PROBES[p].rate)
  }

  const toggleMulti = (): void => {
    if (!probe) return
    if (multi) {
      if (probe === 'probe2') heart.vagusOff()
      else heart.stopMultiStim()
      setMulti(false)
      return
    }
    flash()
    if (probe === 'probe2') heart.vagusOn(stimRate)
    else heart.startMultiStim(stimRate)
    setMulti(true)
  }

  return (
    <div className="grid grid-cols-[300px_minmax(0,1fr)] gap-3 p-3">
      <ToolbarPortal>
        <ModifyDisplay heart={heart} />
      </ToolbarPortal>

      <Panel className="row-span-2 flex flex-col items-center gap-3">
        <div className="rounded-md border border-bench-500 bg-bench-900 px-3 py-1 text-sm font-semibold">
          {t('ringers.label', { temp: 23 })}
        </div>
        <div className="relative flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-bench-50/15 to-bench-50/5 p-3">
          <FrogHeartFigure phase={heart.phase} />
          {probe && (
            <div className={`text-xs font-semibold ${spark || heart.stimulating ? 'text-yellow-300' : 'text-bench-300'}`}>
              ⚡ {t(`probes.${probe}`)}
            </div>
          )}
        </div>
        <div className="flex w-full flex-col gap-2" title={t('probes.hint')}>
          {(['probe1', 'probe2'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => pickProbe(p)}
              disabled={multi || (probe !== null && probe !== p)}
              className={`rounded-lg border p-2 text-sm font-semibold disabled:opacity-40 ${probe === p ? 'border-sky-400 bg-bench-800' : 'border-bench-500 bg-bench-900 hover:bg-bench-800'}`}
            >
              {t(`probes.${p}`)}
            </button>
          ))}
        </div>
      </Panel>

      <div className="flex min-w-0 flex-col rounded-2xl border-4 border-gray-400 bg-gray-300 p-2 shadow-xl">
        <HeartMonitor heart={heart} />
      </div>

      <Panel className="flex flex-wrap items-end justify-around gap-4">
        <div className="flex items-center gap-2">
          <Light on={spark && !multi} />
          <Button
            variant="primary"
            onClick={() => {
              flash()
              heart.singleStimulus()
            }}
            disabled={probe !== 'probe1' || multi}
          >
            {t('actions.single')}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Light on={multi} />
          <Button variant="primary" onClick={toggleMulti} disabled={!probe}>
            {multi ? t('actions.stop') : t('actions.multiple')}
          </Button>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-semibold text-bench-100">{t('fields.voltage')}</span>
          <Readout value={probe ? String(PROBES[probe].voltage) : ''} />
        </div>
        <Stepper
          label={t('fields.stimRate')}
          display={probe ? String(stimRate) : ''}
          disabled={!probe || multi}
          edit={{ min: 1, max: probe ? PROBES[probe].max : 20, step: 1, value: stimRate, onChange: setStimRate }}
        />
      </Panel>
    </div>
  )
}
