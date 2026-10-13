import { DropperBottle } from '@/shared/components/LabGlass'
import { useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { DataTable, type DataColumn } from '@/shared/components/DataTable'
import { Button, Light, Panel } from '@/shared/components/ui'
import { createExperimentStore } from '@/shared/lib/createExperimentStore'
import { FrogHeartFigure, HeartMonitor, useFrogHeart } from '../components/Bench'
import { DRUGS, RETURN_TO_NORMAL_FRAMES, type Drug, type RingerTemp } from '../model/heart'

export type Solution = { kind: 'ringer'; temp: RingerTemp } | { kind: 'drug'; drug: Drug }

export interface ModifierRow {
  solution: Solution
  rate: number
}

export const useModifierStore = createExperimentStore<object, ModifierRow>({})

/** el lavado con Ringer eran 15 gotas cada 50 "ticks" (12.5 s) */
const WASH_FRAMES = 250
/** animación del gotero */
const DROP_FRAMES = 20

export function solutionLabel(t: TFunction, s: Solution): string {
  return s.kind === 'ringer' ? t('ringers.solution', { temp: s.temp }) : t(`drugs.${s.drug}`)
}

export function modifierColumns(t: TFunction): DataColumn<ModifierRow>[] {
  return [
    { key: 'solution', header: t('columns.solution'), value: () => NaN, format: (r) => solutionLabel(t, r.solution) },
    { key: 'rate', header: t('columns.heartRate'), value: (r) => r.rate, format: (r) => String(r.rate) }
  ]
}

/** Experimento 2: efecto de la temperatura, fármacos e iones sobre la frecuencia cardíaca */
export function HeartModifiers(): ReactNode {
  const { t } = useTranslation('frogCardio')
  const s = useModifierStore()
  const [solution, setSolution] = useState<Solution>({ kind: 'ringer', temp: 23 })
  const [wash, setWash] = useState<{ temp: RingerTemp; frames: number } | null>(null)
  const [drop, setDrop] = useState<{ drug: Drug; frames: number } | null>(null)
  const [changeId, setChangeId] = useState(0)
  const [recordedId, setRecordedId] = useState(-1)
  const returnTimer = useRef(0)

  const startWash = (temp: RingerTemp): void => {
    setSolution({ kind: 'ringer', temp })
    setWash({ temp, frames: 0 })
    returnTimer.current = 0
  }

  const heart = useFrogHeart('mr', (h) => {
    if (wash) {
      if (wash.frames + 1 >= WASH_FRAMES) {
        h.applyRinger(wash.temp)
        setChangeId((n) => n + 1)
        setWash(null)
      } else setWash({ ...wash, frames: wash.frames + 1 })
    }
    if (drop) {
      if (drop.frames + 1 >= DROP_FRAMES) {
        h.applyDrug(drop.drug)
        setChangeId((n) => n + 1)
        returnTimer.current = RETURN_TO_NORMAL_FRAMES
        setDrop(null)
      } else setDrop({ ...drop, frames: drop.frames + 1 })
    }
    // a los 2 minutos de un fármaco el original lavaba solo con Ringer a 23°
    if (returnTimer.current > 0) {
      returnTimer.current -= 1
      if (returnTimer.current === 0 && !wash) startWash(23)
    }
  })

  const busy = wash !== null || drop !== null
  const ringerEnabled = (temp: RingerTemp): boolean => {
    if (busy) return false
    if (heart.ringerButtons === 'room') return temp === 23
    if (heart.ringerButtons === 'nonRoom') return temp !== 23
    return false
  }
  const droppersEnabled = heart.droppersAvailable && !busy
  const columns = modifierColumns(t)
  const lit: RingerTemp | null = drop ? null : (wash?.temp ?? (solution.kind === 'ringer' ? solution.temp : null))

  return (
    <>
      <div className="grid grid-cols-[240px_minmax(0,1fr)] items-start gap-4">
        <Panel title={t('panels.ringer')}>
          <div className="grid gap-2">
            {([5, 23, 32] as const).map((temp) => (
              <div key={temp} className="flex items-center gap-3">
                <Light on={lit === temp} label="" />
                <Button
                  className="flex-1"
                  aria-pressed={lit === temp}
                  onClick={() => startWash(temp)}
                  disabled={!ringerEnabled(temp)}
                >
                  {t('ringers.label', { temp })}
                </Button>
              </div>
            ))}
          </div>
          <div className="px-well flex justify-center p-4">
            <FrogHeartFigure phase={heart.phase} wet={busy} />
          </div>
        </Panel>

        <div className="grid min-w-0 gap-4">
          <Panel title={t('panels.agents')}>
            <div className="px-reagents px-reagents--shelf" title={t('hints.droppers')}>
              {DRUGS.map((d) => (
                <DropperBottle
                  key={d}
                  label={t(`drugs.${d}`)}
                  selected={drop?.drug === d}
                  disabled={!droppersEnabled}
                  onClick={() => {
                    setSolution({ kind: 'drug', drug: d })
                    setDrop({ drug: d, frames: 0 })
                  }}
                />
              ))}
            </div>
          </Panel>
          <HeartMonitor heart={heart} />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={s.rows}
        selected={s.selected}
        onSelect={s.select}
        onRecord={() => {
          s.addRow({ solution, rate: heart.targetRateRounded })
          setRecordedId(changeId)
        }}
        onDelete={s.deleteRow}
        onClear={s.clearRows}
        canRecord={!busy && heart.ringerButtons !== 'none' && recordedId !== changeId}
      />
    </>
  )
}
