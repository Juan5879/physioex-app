import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Oscilloscope } from '@/shared/components/Oscilloscope'
import { Button, Light, Readout } from '@/shared/components/ui'
import { fixed } from '@/shared/lib/format'
import { useFrameLoop } from '@/shared/lib/useFrameLoop'
import { CENTRIFUGE_FRAMES, INCUBATE_FRAMES, MIX_FRAMES, STANDARD, standardLine } from '../model/endocrine'

type Step = 'mix' | 'centrifuge' | 'incubate'
const FRAMES: Record<Step, number> = { mix: MIX_FRAMES, centrifuge: CENTRIFUGE_FRAMES, incubate: INCUBATE_FRAMES }

export interface ProcessState {
  mixed: boolean
  centrifuged: boolean
  pelletRemoved: boolean
  incubated: boolean
  /** paso animándose */
  running: Step | null
}

const INITIAL: ProcessState = { mixed: false, centrifuged: false, pelletRemoved: false, incubated: false, running: null }

/** Mezclar → centrifugar → quitar sedimento → (gotas de color) → incubar, con sus animaciones */
export function useTubeProcess(): {
  state: ProcessState
  run: (step: Step) => void
  removePellet: () => void
  reset: () => void
} {
  const [state, setState] = useState<ProcessState>(INITIAL)
  const [frames, setFrames] = useState(0)
  useFrameLoop(state.running !== null, () => {
    if (!state.running) return
    if (frames + 1 >= FRAMES[state.running]) {
      const done = state.running
      setFrames(0)
      setState((s) => ({
        ...s,
        running: null,
        mixed: s.mixed || done === 'mix',
        centrifuged: s.centrifuged || done === 'centrifuge',
        incubated: s.incubated || done === 'incubate'
      }))
    } else setFrames((f) => f + 1)
  })
  return {
    state,
    run: (step) => {
      setFrames(0)
      setState((s) => ({ ...s, running: step }))
    },
    removePellet: () => setState((s) => ({ ...s, pelletRemoved: true })),
    reset: () => {
      setFrames(0)
      setState(INITIAL)
    }
  }
}

/** Botones de mezclar, centrifugar, quitar sedimento e incubar */
export function ProcessButtons({
  process,
  canMix,
  canIncubate
}: {
  process: ReturnType<typeof useTubeProcess>
  canMix: boolean
  canIncubate: boolean
}): ReactNode {
  const { t } = useTranslation('endocrine')
  const { state, run, removePellet } = process
  const busy = state.running !== null
  const row = (step: Step | 'pellet', label: string, enabled: boolean, onClick: () => void): ReactNode => (
    <div className="flex items-center gap-2">
      <Light on={state.running === step} />
      <Button onClick={onClick} disabled={!enabled || busy} className="flex-1">
        {label}
      </Button>
    </div>
  )
  return (
    <div className="grid grid-cols-2 gap-2">
      {row('mix', t('actions.mix'), canMix && !state.mixed, () => run('mix'))}
      {row('incubate', t('actions.incubate'), canIncubate && !state.incubated, () => run('incubate'))}
      {row('centrifuge', t('actions.centrifuge'), state.mixed && !state.centrifuged, () => run('centrifuge'))}
      {row('pellet', t('actions.removePellet'), state.centrifuged && !state.pelletRemoved, removePellet)}
    </div>
  )
}

/**
 * Pantalla del espectrofotómetro: densidad óptica contra glucosa, con los puntos medidos,
 * la recta patrón y la línea de lectura.
 */
export function SpectroGraph({
  points,
  showLine,
  readingX,
  light
}: {
  points: Array<{ x: number; y: number }>
  showLine: boolean
  readingX?: number | null
  light?: boolean
}): ReactNode {
  const { t } = useTranslation('endocrine')
  const { slope, intercept } = standardLine()
  const line = showLine
    ? [
        { x: 20, y: intercept + slope * 20 },
        { x: 160, y: intercept + slope * 160 }
      ]
    : []
  return (
    <Oscilloscope
      xMin={0}
      xMax={160}
      yMin={0}
      yMax={1.05}
      xTicks={STANDARD.glucose}
      yTicks={[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]}
      xLabel={t('fields.glucose')}
      yLabel={t('fields.opticalDensity')}
      series={[
        { id: 'line', color: '#ffffff', points: line },
        { id: 'pts', color: '#ffffff', points, mode: 'dots' }
      ]}
      measureX={readingX}
      light={light}
      height={260}
    />
  )
}

/** Lecturas de densidad óptica y glucosa bajo el espectrofotómetro */
export function SpectroReadouts({ od, glucose }: { od: number | null; glucose: number | null }): ReactNode {
  const { t } = useTranslation('endocrine')
  return (
    <div className="grid grid-cols-[auto_auto] items-center justify-center gap-x-3 gap-y-1">
      <Readout value={od === null ? '0' : fixed(od, 2)} />
      <span className="text-sm">{t('fields.opticalDensity')}</span>
      <Readout value={glucose === null ? '0' : String(glucose)} />
      <span className="text-sm">{t('fields.glucose')}</span>
    </div>
  )
}
