import { useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Oscilloscope } from '@/shared/components/Oscilloscope'
import { Button, Light, Panel, Readout } from '@/shared/components/ui'
import { splitUnit } from '@/shared/lib/format'
import { useFrameLoop } from '@/shared/lib/useFrameLoop'
import { FrogHeart, V_MAX, type Experiment, type HeartPhase } from '../model/heart'

/**
 * Corazón que late a 20 fps mientras la pantalla está abierta. `onFrame` corre después de
 * cada frame (temporizadores del experimento).
 */
export function useFrogHeart(experiment: Experiment, onFrame?: (h: FrogHeart) => void): FrogHeart {
  const heart = useRef<FrogHeart | null>(null)
  if (!heart.current) heart.current = new FrogHeart(experiment)
  const [, setTick] = useState(0)
  useFrameLoop(true, () => {
    const h = heart.current
    if (!h) return
    h.stepFrame()
    onFrame?.(h)
    setTick((n) => (n + 1) % 1_000_000)
  })
  return heart.current
}

/**
 * Panel «Registro»: trazo de la contracción con la escala («Mejorar trazo» / «Aumentar velocidad»)
 * en el encabezado, y la frecuencia y el estado debajo. Con `light` sólo el gráfico (impresión).
 */
export function HeartMonitor({ heart, light = false }: { heart: FrogHeart; light?: boolean }): ReactNode {
  const { t } = useTranslation('frogCardio')
  const tc = useTranslation().t
  const xTicks = Array.from({ length: heart.uMax + 1 }, (_, i) => i)
  const chart = (
      <Oscilloscope
        xMax={heart.uMax}
        yMax={V_MAX}
        xTicks={xTicks}
        yTicks={[]}
        xLabel={t('fields.time')}
        yLabel={t('fields.contraction')}
        series={[{ id: 'heart', color: 'var(--chart-1)', points: heart.points }]}
        light={light}
        height={240}
      />
  )
  if (light) return chart
  return (
    <Panel title={tc('common.recording')} actions={<ModifyDisplay heart={heart} />} bodyClassName="!gap-0">
      {chart}
      <div className="px-chart__bar">
        <span>{splitUnit(t('fields.heartRate'))?.text ?? t('fields.heartRate')}</span>
        <Readout value={heart.displayedRate === null ? '' : String(heart.displayedRate)} unit={t('units.bpm')} />
        <Readout text value={t(`status.${heart.status}`)} />
        <span className="flex-1" />
        <Light on label={tc('common.recordingNow')} />
      </div>
    </Panel>
  )
}

/** Dibujo del corazón: las aurículas y el ventrículo se achican al contraerse */
export function FrogHeartFigure({ phase, wet }: { phase: HeartPhase; wet?: boolean }): ReactNode {
  const atria = phase === 'AC' ? 0.85 : 1
  const ventricle = phase === 'VC' || phase === 'ESC' ? 0.86 : 1
  return (
    <svg viewBox="0 0 120 130" className="w-28">
      <line className="il-thin" x1={60} y1={0} x2={60} y2={20} />
      <circle className="il-thin" cx={60} cy={24} r={4} />
      <g style={{ transformOrigin: '60px 45px', transform: `scale(${atria})`, transition: 'transform 80ms' }}>
        <ellipse className="il-tissue" cx={44} cy={45} rx={20} ry={16} />
        <ellipse className="il-tissue" cx={76} cy={45} rx={20} ry={16} opacity={0.8} />
      </g>
      <g style={{ transformOrigin: '60px 80px', transform: `scale(${ventricle})`, transition: 'transform 80ms' }}>
        <path className="il-tissue" d="M 30 62 Q 60 50 90 62 Q 92 100 60 125 Q 28 100 30 62 Z" />
        <path className="il-thin" d="M 45 75 Q 58 95 55 115" />
      </g>
      {wet && <ellipse className="il-liquid" cx={60} cy={70} rx={36} ry={24} fillOpacity={0.3} />}
    </svg>
  )
}

/** "Modify Display": cambia la escala del monitor entre 10 y 15 s */
export function ModifyDisplay({ heart }: { heart: FrogHeart }): ReactNode {
  const { t } = useTranslation('frogCardio')
  return (
    <div className="flex items-center gap-1 py-1.5">
      <Button variant="ghost" size="sm" aria-pressed={heart.uMax === 10} onClick={() => heart.changeScale(10)}>
        {t('actions.improve')}
      </Button>
      <Button variant="ghost" size="sm" aria-pressed={heart.uMax === 15} onClick={() => heart.changeScale(15)}>
        {t('actions.speed')}
      </Button>
    </div>
  )
}
