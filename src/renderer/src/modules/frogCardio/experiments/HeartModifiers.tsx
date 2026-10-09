import { useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { DataTable, type DataColumn } from '@/shared/components/DataTable'
import { ToolbarPortal } from '@/shared/components/ToolbarSlot'
import { Light, Panel } from '@/shared/components/ui'
import { createExperimentStore } from '@/shared/lib/createExperimentStore'
import { FrogHeartFigure, HeartMonitor, ModifyDisplay, useFrogHeart } from '../components/Bench'
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
    <div className="grid grid-cols-[260px_minmax(0,1fr)] gap-3 p-3">
      <ToolbarPortal>
        <ModifyDisplay heart={heart} />
      </ToolbarPortal>

      <Panel className="row-span-2 flex flex-col items-center gap-3">
        <div className="flex w-full flex-col gap-2">
          {([5, 23, 32] as const).map((temp) => (
            <div key={temp} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => startWash(temp)}
                disabled={!ringerEnabled(temp)}
                className="flex-1 rounded-md border border-bench-300 bg-bench-100 px-3 py-1.5 text-sm font-semibold text-bench-900 hover:bg-white disabled:opacity-40"
              >
                {t('ringers.label', { temp })}
              </button>
              <Light on={lit === temp} />
            </div>
          ))}
        </div>
        <div className="rounded-xl bg-gradient-to-b from-bench-50/15 to-bench-50/5 p-3">
          <FrogHeartFigure phase={heart.phase} wet={busy} />
        </div>
      </Panel>

      <div className="flex min-w-0 flex-col gap-3">
        <Panel>
          <div className="grid grid-cols-4 gap-2 lg:grid-cols-7" title={t('hints.droppers')}>
            {DRUGS.map((d) => (
              <button
                key={d}
                type="button"
                disabled={!droppersEnabled}
                onClick={() => {
                  setSolution({ kind: 'drug', drug: d })
                  setDrop({ drug: d, frames: 0 })
                }}
                className={`flex flex-col items-center gap-1 rounded-lg border border-bench-500 bg-bench-900 p-1.5 text-xs font-semibold hover:bg-bench-800 disabled:opacity-40 ${drop?.drug === d ? 'animate-pulse border-sky-400' : ''}`}
              >
                <svg viewBox="0 0 30 50" className="h-10 w-6">
                  <rect x={11} y={2} width={8} height={10} rx={3} fill="#111827" />
                  <path d="M 5 18 Q 5 14 9 14 H 21 Q 25 14 25 18 V 44 Q 25 48 21 48 H 9 Q 5 48 5 44 Z" fill="#dbeafe" />
                  <rect x={7} y={28} width={16} height={18} rx={3} fill="#93c5fd" />
                </svg>
                <span className="text-center leading-tight">{t(`drugs.${d}`)}</span>
              </button>
            ))}
          </div>
        </Panel>
        <div className="flex min-w-0 flex-col rounded-2xl border-4 border-gray-400 bg-gray-300 p-2 shadow-xl">
          <HeartMonitor heart={heart} />
        </div>
      </div>

      <Panel>
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
      </Panel>
    </div>
  )
}
