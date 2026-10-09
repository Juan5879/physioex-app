import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import type { DataColumn } from '@/shared/components/DataTable'
import { DataSetTable, PrintDataSets } from '@/shared/components/DataSetTable'
import { ExperimentTools } from '@/shared/components/ExperimentTools'
import { Stepper } from '@/shared/components/Stepper'
import { ToolbarPortal } from '@/shared/components/ToolbarSlot'
import { Button, Light, Panel, Readout } from '@/shared/components/ui'
import { fixed } from '@/shared/lib/format'
import { useFrameLoop } from '@/shared/lib/useFrameLoop'
import { Beaker, Nephron } from '@/modules/renal/components/Nephron'
import { RENAL, RENAL_DEFAULT, noisyPh, type Level } from '../model/acidBase'
import { useRenalSets, type RenalRow } from '../store'

/** etapas: llenado de la nefrona (40 frames) y vaciado de los vasos de a 5 % (28 frames) */
const FILL_FRAMES = 40
const DRAIN_FRAMES = 28

export function renalColumns(t: TFunction): DataColumn<RenalRow>[] {
  return [
    { key: 'pco2', header: t('columns.pco2'), value: (r) => r.pco2, format: (r) => String(r.pco2) },
    { key: 'ph', header: t('columns.bloodPh'), value: (r) => r.ph, format: (r) => fixed(r.ph) },
    { key: 'h', header: t('columns.hUrine'), value: () => NaN, format: (r) => t(`levels.${r.h}`) },
    { key: 'hco3', header: t('columns.hco3Urine'), value: () => NaN, format: (r) => t(`levels.${r.hco3}`) }
  ]
}

/** Experimento 3: los riñones compensan una PCO₂ alterada excretando H⁺ o HCO₃⁻ */
export function RenalCompensation(): ReactNode {
  const { t } = useTranslation('acidBase')
  const sets = useRenalSets()
  const [index, setIndex] = useState(RENAL_DEFAULT)
  const [ph, setPh] = useState(() => noisyPh(RENAL.ph[RENAL_DEFAULT]))
  const [phase, setPhase] = useState<'ready' | 'running' | 'done' | 'refilling'>('ready')
  const [frame, setFrame] = useState(0)
  const [level, setLevel] = useState(1)
  const [result, setResult] = useState<{ h: Level; hco3: Level } | null>(null)
  const [recordable, setRecordable] = useState(false)

  useFrameLoop(phase === 'running' || phase === 'refilling', () => {
    if (phase === 'refilling') {
      setLevel((l) => {
        const n = Math.min(1, l + 0.05)
        if (n >= 1) {
          setPhase('ready')
          setResult(null)
        }
        return n
      })
      return
    }
    const f = frame + 1
    setFrame(f)
    if (f > FILL_FRAMES) setLevel(Math.max(0, 1 - (f - FILL_FRAMES) / DRAIN_FRAMES))
    if (f >= FILL_FRAMES + DRAIN_FRAMES) {
      setPhase('done')
      setResult({ h: RENAL.h[index], hco3: RENAL.hco3[index] })
      setRecordable(true)
    }
  })

  const pick = (v: number): void => {
    const i = RENAL.pco2.indexOf(v)
    if (i < 0) return
    setIndex(i)
    setPh(noisyPh(RENAL.ph[i]))
  }

  const columns = renalColumns(t)
  const label = (n: string): string => t(`sets.${n}`, { defaultValue: n })

  return (
    <div className="grid grid-cols-[260px_minmax(0,1fr)] gap-3 p-3">
      <ToolbarPortal>
        <ExperimentTools
          lab={t('title')}
          experiment={t('experiments.rsc')}
          columns={columns}
          rows={sets.sets[sets.selected]?.rows ?? []}
          printableData={<PrintDataSets sets={sets.sets} columns={columns} label={label} />}
        />
      </ToolbarPortal>
      <Panel className="flex flex-col items-center gap-3">
        <div className="flex gap-2">
          <Beaker level={level} color="#b91c1c" />
          <Beaker level={1 - level} color="#fca5a5" />
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2">
            <Light on={phase === 'running'} />
            <Button
              variant="primary"
              onClick={() => {
                if (phase === 'running') {
                  setPhase('ready')
                  setFrame(0)
                  setLevel(1)
                  return
                }
                setFrame(0)
                setResult(null)
                setRecordable(false)
                setPhase('running')
              }}
              disabled={phase === 'done' || phase === 'refilling'}
            >
              {phase === 'running' ? t('actions.stop') : t('actions.start')}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Light on={phase === 'refilling'} />
            <Button onClick={() => setPhase('refilling')} disabled={phase !== 'done'}>
              {t('actions.refill')}
            </Button>
          </div>
        </div>
        {/* PCO₂: 8 valores fijos del original */}
        <Stepper
          label={t('fields.pco2')}
          display={String(RENAL.pco2[index])}
          disabled={phase !== 'ready'}
          canDecrement={index > 0}
          canIncrement={index < RENAL.pco2.length - 1}
          onStep={(d) => pick(RENAL.pco2[Math.max(0, Math.min(RENAL.pco2.length - 1, index + d))])}
          edit={{
            min: RENAL.pco2[0],
            max: RENAL.pco2[RENAL.pco2.length - 1],
            step: 1,
            value: RENAL.pco2[index],
            onChange: (v) => pick(RENAL.pco2.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a)))
          }}
        />
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-semibold text-bench-100">{t('fields.bloodPh')}</span>
          <Readout value={fixed(ph)} />
        </div>
      </Panel>
      <div className="flex flex-col gap-3">
        <div className="rounded-xl bg-gradient-to-b from-bench-50/15 to-bench-50/5 p-2">
          <Nephron
            afferent={0.5}
            efferent={0.45}
            flowing={phase === 'running'}
            urineFlowing={phase === 'running' && frame > FILL_FRAMES}
            valveOpen
          />
        </div>
        <Panel className="flex items-center justify-center gap-6">
          <span className="text-sm font-semibold text-bench-100">{t('fields.urine')}</span>
          <div className="flex items-center gap-2">
            <span className="text-sm">{t('fields.h')}</span>
            <Readout value={result ? t(`levels.${result.h}`) : ''} className="min-w-28 text-center" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">{t('fields.hco3')}</span>
            <Readout value={result ? t(`levels.${result.hco3}`) : ''} className="min-w-28 text-center" />
          </div>
        </Panel>
      </div>
      <Panel className="col-span-2">
        <DataSetTable
          store={sets}
          columns={columns}
          editable
          label={label}
          canRecord={recordable && result !== null}
          onRecord={() => {
            if (!result) return
            sets.addRow({ pco2: RENAL.pco2[index], ph, h: result.h, hco3: result.hco3 })
            setRecordable(false)
          }}
        />
      </Panel>
    </div>
  )
}
