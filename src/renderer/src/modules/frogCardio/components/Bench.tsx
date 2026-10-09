import { useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Oscilloscope } from '@/shared/components/Oscilloscope'
import { Button, Readout } from '@/shared/components/ui'
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

/** Monitor con el trazo de la contracción, la frecuencia y el estado */
export function HeartMonitor({ heart, light = false }: { heart: FrogHeart; light?: boolean }): ReactNode {
  const { t } = useTranslation('frogCardio')
  const xTicks = Array.from({ length: heart.uMax + 1 }, (_, i) => i)
  return (
    <div className="flex flex-col gap-2">
      <Oscilloscope
        xMax={heart.uMax}
        yMax={V_MAX}
        xTicks={xTicks}
        yTicks={[]}
        xLabel={t('fields.time')}
        yLabel={t('fields.contraction')}
        series={[{ id: 'heart', color: '#4dd2ff', points: heart.points }]}
        light={light}
        height={240}
      />
      {!light && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-bench-900">{t('fields.heartRate')}</span>
            <Readout value={heart.displayedRate === null ? '----' : String(heart.displayedRate)} />
          </div>
          <Readout value={t(`status.${heart.status}`)} className="min-w-56 text-center" />
        </div>
      )}
    </div>
  )
}

/** Dibujo del corazón: las aurículas y el ventrículo se achican al contraerse */
export function FrogHeartFigure({ phase, wet }: { phase: HeartPhase; wet?: boolean }): ReactNode {
  const atria = phase === 'AC' ? 0.85 : 1
  const ventricle = phase === 'VC' || phase === 'ESC' ? 0.86 : 1
  return (
    <svg viewBox="0 0 120 130" className="w-28">
      <line x1={60} y1={0} x2={60} y2={22} stroke="#9ca3af" strokeWidth={2} />
      <circle cx={60} cy={24} r={4} fill="none" stroke="#9ca3af" strokeWidth={2} />
      <g style={{ transformOrigin: '60px 45px', transform: `scale(${atria})`, transition: 'transform 80ms' }}>
        <ellipse cx={44} cy={45} rx={20} ry={16} fill="#b91c1c" />
        <ellipse cx={76} cy={45} rx={20} ry={16} fill="#991b1b" />
      </g>
      <g style={{ transformOrigin: '60px 80px', transform: `scale(${ventricle})`, transition: 'transform 80ms' }}>
        <path d="M 30 62 Q 60 50 90 62 Q 92 100 60 125 Q 28 100 30 62 Z" fill="#dc2626" stroke="#7f1d1d" />
        <path d="M 45 75 Q 58 95 55 115" fill="none" stroke="#fca5a5" strokeOpacity={0.5} strokeWidth={3} />
      </g>
      {wet && <ellipse cx={60} cy={70} rx={36} ry={24} fill="#bae6fd" fillOpacity={0.25} />}
    </svg>
  )
}

/** "Modify Display": cambia la escala del monitor entre 10 y 15 s */
export function ModifyDisplay({ heart }: { heart: FrogHeart }): ReactNode {
  const { t } = useTranslation('frogCardio')
  return (
    <div className="flex items-center gap-1">
      <Button variant={heart.uMax === 10 ? 'primary' : 'ghost'} onClick={() => heart.changeScale(10)}>
        {t('actions.improve')}
      </Button>
      <Button variant={heart.uMax === 15 ? 'primary' : 'ghost'} onClick={() => heart.changeScale(15)}>
        {t('actions.speed')}
      </Button>
    </div>
  )
}
