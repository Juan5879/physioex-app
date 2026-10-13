import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Stepper } from '@/shared/components/Stepper'
import { Button, Light, Panel, ReadoutField } from '@/shared/components/ui'
import { FrogHeartFigure, HeartMonitor, useFrogHeart } from '../components/Bench'

type Probe = 'probe1' | 'probe2'

/** voltaje fijo y estímulos/s (inicial y máximo) de cada electrodo (f_probeRelease, f_scroll) */
const PROBES: Record<Probe, { voltage: number; rate: number; max: number }> = {
  probe1: { voltage: 20, rate: 20, max: 20 },
  probe2: { voltage: 1, rate: 50, max: 50 }
}

/** Experimento 1: periodo refractario, extrasístoles, sumación y estimulación vagal */
export function ElectricalStimulation(): ReactNode {
  const { t } = useTranslation('frogCardio')
  const tc = useTranslation().t
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
    <div className="grid grid-cols-[240px_minmax(0,1fr)_240px] items-start gap-4">
      <Panel title={tc('common.preparation')}>
        <span className="px-chip justify-self-start">{t('ringers.label', { temp: 23 })}</span>
        <div className="px-well flex items-center justify-center gap-2 p-4">
          <FrogHeartFigure phase={heart.phase} />
        </div>
        <div className="px-field" title={t('probes.hint')}>
          <span className="px-label">{t('probes.mode')}</span>
          <div className="grid gap-2">
            {(['probe1', 'probe2'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => pickProbe(p)}
                disabled={multi || (probe !== null && probe !== p)}
                aria-pressed={probe === p}
                className="px-reagent disabled:cursor-not-allowed disabled:opacity-45"
              >
                {t(`probes.${p}`)}
              </button>
            ))}
          </div>
        </div>
      </Panel>

      <HeartMonitor heart={heart} />

      <Panel
        title={tc('common.stimulator')}
        actions={<Light on={spark || multi} label={multi ? tc('common.inProgress') : tc('common.ready')} />}
      >
        <Button
          variant="primary"
          block
          icon="play"
          onClick={() => {
            flash()
            heart.singleStimulus()
          }}
          disabled={probe !== 'probe1' || multi}
        >
          {t('actions.single')}
        </Button>
        <Button block variant={multi ? 'danger' : 'secondary'} onClick={toggleMulti} disabled={!probe}>
          {multi ? t('actions.stop') : t('actions.multiple')}
        </Button>
        <div className="px-section">
          <ReadoutField label={t('fields.voltage')} unit="V" value={probe ? String(PROBES[probe].voltage) : ''} />
          <Stepper
            block
            label={t('fields.stimRate')}
            display={probe ? String(stimRate) : ''}
            disabled={!probe || multi}
            edit={{ min: 1, max: probe ? PROBES[probe].max : 20, step: 1, value: stimRate, onChange: setStimRate }}
          />
        </div>
      </Panel>
    </div>
  )
}
