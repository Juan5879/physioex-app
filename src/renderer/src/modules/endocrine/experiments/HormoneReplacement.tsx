import { splitUnit } from '@/shared/lib/format'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import type { DataColumn } from '@/shared/components/DataTable'
import { DataSetTable, PrintDataSets } from '@/shared/components/DataSetTable'
import { ExperimentTools } from '@/shared/components/ExperimentTools'
import { ToolbarPortal } from '@/shared/components/ToolbarSlot'
import { Button, Hint, Notice, Panel, Readout } from '@/shared/components/ui'
import { DropperBottle, RatFigure } from '../components/Figures'
import { MAX_DAYS, paperReading, uterusReading } from '../model/endocrine'
import { useHrtSets, type HrtRow } from '../store'

type RatKey = 'control' | 'experimental'
const RAT_KEYS: RatKey[] = ['control', 'experimental']
type Fluid = 'saline' | 'estrogen'

interface RatState {
  saline: number
  estrogen: number
  /** ya recibió su inyección de hoy (allowance del original) */
  injectedToday: boolean
  /** la rata está entera, se le extrajo el útero, o el útero ya se pesó y se descartó */
  status: 'alive' | 'uterus' | 'discarded'
}

const NEW_RAT: RatState = { saline: 0, estrogen: 0, injectedToday: false, status: 'alive' }

export function hrtColumns(t: TFunction): DataColumn<HrtRow>[] {
  return [
    { key: 'days', header: t('columns.days'), value: (r) => r.days, format: (r) => String(r.days) },
    { key: 'saline', header: t('columns.saline'), value: (r) => r.saline, format: (r) => String(r.saline) },
    { key: 'estrogen', header: t('columns.estrogen'), value: (r) => r.estrogen, format: (r) => String(r.estrogen) },
    { key: 'weight', header: t('columns.uterusWeight'), value: (r) => r.weight, format: (r) => String(r.weight) }
  ]
}

/** Experimento 2: efecto del estrógeno sobre el peso del útero de ratas ovariectomizadas */
export function HormoneReplacement(): ReactNode {
  const { t } = useTranslation('endocrine')
  const sets = useHrtSets()
  const [rats, setRats] = useState<Record<RatKey, RatState>>({ control: NEW_RAT, experimental: NEW_RAT })
  const [syringe, setSyringe] = useState<{ fluid: Fluid; used: boolean } | null>(null)
  const [days, setDays] = useState(0)
  const [paper, setPaper] = useState(false)
  const [tared, setTared] = useState(false)
  const [onScale, setOnScale] = useState<{ rat: RatKey; estrogen: number } | null>(null)
  const [weight, setWeight] = useState<number>(0)
  const [weighed, setWeighed] = useState(false)
  const [recordable, setRecordable] = useState(false)
  const [alert, setAlert] = useState<string | null>(null)

  const patchRat = (r: RatKey, patch: Partial<RatState>): void =>
    setRats((s) => ({ ...s, [r]: { ...s[r], ...patch } }))

  const fill = (fluid: Fluid): void => {
    if (syringe?.used) return setAlert('cleanSyringe')
    if (!syringe) setSyringe({ fluid, used: false })
  }

  const inject = (r: RatKey): void => {
    if (!syringe || syringe.used) return setAlert('fillFirst')
    const rat = rats[r]
    if (rat.status !== 'alive') return
    if (rat.injectedToday) return setAlert('oneInjection')
    patchRat(r, { [syringe.fluid]: rat[syringe.fluid] + 1, injectedToday: true })
    setSyringe({ ...syringe, used: true })
  }

  const cleanScale = (): void => {
    if (onScale) patchRat(onScale.rat, { status: 'discarded' })
    setOnScale(null)
    setPaper(false)
    setTared(false)
    setWeight(0)
    setWeighed(false)
    setRecordable(false)
  }

  const reset = (): void => {
    setRats({ control: NEW_RAT, experimental: NEW_RAT })
    setSyringe(null)
    setDays(0)
    setOnScale(null)
    setPaper(false)
    setTared(false)
    setWeight(0)
    setWeighed(false)
    setRecordable(false)
  }

  const weigh = (): void => {
    if (!paper) return
    if (onScale) {
      setWeight((w) => Number(w) + uterusReading(onScale.estrogen))
      setWeighed(true)
      setRecordable(true)
    } else if (!tared) {
      setWeight(paperReading())
    }
  }

  const columns = hrtColumns(t)
  const label = (name: string): string => t(`sets.${name}`)
  const shownWeight = weight === 0 ? '0.00' : String(weight)

  return (
    <>
      <div className="grid grid-cols-[240px_minmax(0,1fr)_280px] items-start gap-4">
      <ToolbarPortal>
        <ExperimentTools
          lab={t('title')}
          experiment={t('experiments.hrt')}
          columns={columns}
          rows={sets.sets.flatMap((s) => s.rows)}
          printableData={<PrintDataSets sets={sets.sets} columns={columns} label={label} />}
        />
      </ToolbarPortal>

      <Panel title={t('panels.syringe')}>
        <Readout text value={syringe ? `${t(`reagents.${syringe.fluid}`)}${syringe.used ? ' ✓' : ''}` : ''} />
        <div className="grid grid-cols-2 gap-2">
          <DropperBottle label={t('reagents.saline')} onClick={() => fill('saline')} selected={syringe?.fluid === 'saline'} />
          <DropperBottle
            label={t('reagents.estrogen')}
            color="var(--chart-4)"
            onClick={() => fill('estrogen')}
            selected={syringe?.fluid === 'estrogen'}
          />
        </div>
        <Button size="sm" onClick={() => setSyringe(null)} disabled={!syringe}>
          {t('actions.cleanSyringe')}
        </Button>
        <div className="px-section">
          <div className="px-row">
            <span className="px-label">{t('fields.elapsedDays')}</span>
            <Readout value={String(days)} />
          </div>
          <Button
            block
            onClick={() => {
              setDays((d) => d + 1)
              setRats((s) => ({
                control: { ...s.control, injectedToday: false },
                experimental: { ...s.experimental, injectedToday: false }
              }))
            }}
            disabled={days >= MAX_DAYS}
          >
            {t('actions.advanceDay')}
          </Button>
        </div>
        <Button variant="ghost" size="sm" onClick={reset}>
          {t('actions.resetExperiment')}
        </Button>
      </Panel>

        <Panel title={t('panels.subjects')}>
          <Hint>{t('hints.hrt')}</Hint>
          {RAT_KEYS.map((r) => {
            const rat = rats[r]
            return (
              <div key={r} className="px-section flex flex-wrap items-center gap-3">
                <span className="w-full text-sm font-semibold">{t(`rats.${r}`)}</span>
                <button
                  type="button"
                  onClick={() => inject(r)}
                  disabled={rat.status !== 'alive'}
                  title={t('actions.inject')}
                  className="px-well px-2 py-1 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {rat.status === 'alive' ? (
                    <svg viewBox="0 0 100 60" className="h-10 w-16">
                      <RatFigure />
                    </svg>
                  ) : rat.status === 'uterus' ? (
                    <Uterus estrogen={rat.estrogen} />
                  ) : (
                    <span className="block h-10 w-16" />
                  )}
                </button>
                <div className="flex items-center gap-2">
                  <span className="px-label">{t('fields.saline')}</span>
                  <Readout value={String(rat.saline)} className="!min-w-12" />
                  <span className="px-label">{t('fields.estrogen')}</span>
                  <Readout value={String(rat.estrogen)} className="!min-w-12" />
                </div>
                <div className="flex w-full flex-wrap gap-2">
                  <Button onClick={() => patchRat(r, { status: 'uterus' })} disabled={rat.status !== 'alive'}>
                    {t('actions.removeUterus')}
                  </Button>
                  <Button
                    onClick={() => {
                      if (rat.status !== 'uterus') return
                      if (!paper || !tared || onScale) return setAlert('paperFirst')
                      setOnScale({ rat: r, estrogen: rat.estrogen })
                      sets.selectSet(RAT_KEYS.indexOf(r))
                    }}
                    disabled={rat.status !== 'uterus' || onScale !== null}
                  >
                    {t('actions.uterusToScale')}
                  </Button>
                  <Button onClick={() => patchRat(r, NEW_RAT)} disabled={onScale?.rat === r}>
                    {t('actions.clean')}
                  </Button>
                </div>
              </div>
            )
          })}
        </Panel>

        <Panel title={t('panels.scale')}>
          <div className="px-well p-3">
          <svg viewBox="0 0 160 50" className="mx-auto block w-40">
            <ellipse className="il-metal" cx={80} cy={30} rx={70} ry={10} />
            {paper && <rect className="il-glass" x={45} y={18} width={70} height={10} transform="skewX(-20)" />}
            {onScale && (
              <g transform="translate(62 0)">
                <Uterus estrogen={onScale.estrogen} small />
              </g>
            )}
          </svg>
          </div>
          <div className="px-row">
            <span className="px-label">{splitUnit(t('fields.weight'))?.text ?? t('fields.weight')}</span>
            <Readout value={shownWeight} unit={splitUnit(t('fields.weight'))?.unit} />
          </div>
          <div className="grid w-full grid-cols-2 gap-2">
            <Button onClick={() => !paper && (setPaper(true), setWeight(paperReading()))} disabled={paper}>
              {t('actions.paper')}
            </Button>
            <Button
              onClick={() => {
                setWeight(0)
                setTared(true)
              }}
              disabled={!paper || tared}
            >
              {t('actions.tare')}
            </Button>
            <Button onClick={weigh} disabled={!paper || weighed || (tared && !onScale)}>
              {t('actions.weigh')}
            </Button>
            <Button onClick={cleanScale} disabled={!paper}>
              {t('actions.clean')}
            </Button>
          </div>
        </Panel>
      </div>

        <DataSetTable
          store={sets}
          columns={columns}
          label={label}
          canRecord={recordable && onScale !== null}
          onRecord={() => {
            if (!onScale) return
            const rat = rats[onScale.rat]
            sets.addRow(
              { days, saline: rat.saline, estrogen: rat.estrogen, weight: Number(weight) },
              RAT_KEYS.indexOf(onScale.rat)
            )
            setRecordable(false)
          }}
        />

      {alert && <Notice title={t('alerts.title')} lines={[t(`alerts.${alert}`)]} onClose={() => setAlert(null)} />}
    </>
  )
}

/** Útero: crece con las inyecciones de estrógeno */
function Uterus({ estrogen, small = false }: { estrogen: number; small?: boolean }): ReactNode {
  const s = 0.6 + Math.min(estrogen, 15) * 0.04
  const svg = (
    <g transform={`translate(18 20) scale(${s}) translate(-18 -20)`}>
      <path className="il-tissue-stroke" d="M 4 6 Q 10 22 18 26 Q 26 22 32 6" strokeWidth={5} />
      <rect className="il-tissue" x={15} y={24} width={6} height={12} rx={3} />
    </g>
  )
  return small ? svg : <svg viewBox="0 0 36 40" className="h-10 w-16">{svg}</svg>
}
