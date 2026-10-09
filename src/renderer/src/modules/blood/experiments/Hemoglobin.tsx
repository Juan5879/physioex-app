import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { DataTable, type DataColumn } from '@/shared/components/DataTable'
import { ExperimentTools } from '@/shared/components/ExperimentTools'
import { Stepper } from '@/shared/components/Stepper'
import { ToolbarPortal } from '@/shared/components/ToolbarSlot'
import { BloodLayout, SampleBar } from '../components/Common'
import { HB_SAMPLE_GREEN, HB_SCALE, HEMOGLOBIN, hbGreen } from '../model/blood'
import { useHbStore, type HbRow } from '../store'

export function hbColumns(t: TFunction): DataColumn<HbRow>[] {
  return [
    { key: 'sample', header: t('columns.sample'), value: (r) => r.sample, format: (r) => String(r.sample) },
    { key: 'hb', header: t('columns.hb'), value: (r) => r.reading, format: (r) => String(r.reading) }
  ]
}

/** Actividad 3: hemoglobina con el hemoglobinómetro (comparar colores) */
export function Hemoglobin(): ReactNode {
  const { t } = useTranslation('blood')
  const s = useHbStore()
  const [sample, setSample] = useState<number | null>(null)
  const [reading, setReading] = useState(14)
  const recorded = s.rows.map((r) => r.sample - 1)
  const columns = hbColumns(t)
  const swatch = (g: number): string => `rgb(8, ${g}, 20)`

  return (
    <BloodLayout
      left={
        <>
          <ToolbarPortal>
            <ExperimentTools lab={t('title')} experiment={t('experiments.hb')} columns={columns} rows={s.rows} />
          </ToolbarPortal>
          <SampleBar count={HEMOGLOBIN.length} selected={sample} used={recorded} onSelect={setSample} label={t('actions.insertChamber')} />
          <p className="text-xs text-bench-300">{t('hints.hb')}</p>
          <div className="flex items-center justify-center gap-0 rounded-xl border-4 border-gray-500 bg-black p-4">
            <div className="flex flex-col items-center gap-1">
              <div className="h-28 w-24 rounded-l-full" style={{ background: sample !== null ? swatch(HB_SAMPLE_GREEN[sample]) : '#111' }} />
              <span className="text-xs text-bench-100">{t('fields.sampleColor')}</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="h-28 w-24 rounded-r-full" style={{ background: swatch(hbGreen(reading)) }} />
              <span className="text-xs text-bench-100">{t('fields.standard')}</span>
            </div>
          </div>
        </>
      }
      right={
        <>
          <Stepper
            label={t('fields.hbReading')}
            display={String(reading)}
            disabled={sample === null}
            edit={{ ...HB_SCALE, value: reading, onChange: setReading }}
          />
          <input
            type="range"
            min={HB_SCALE.min}
            max={HB_SCALE.max}
            value={reading}
            disabled={sample === null}
            onChange={(e) => setReading(Number(e.target.value))}
            className="w-full accent-emerald-500"
          />
        </>
      }
      table={
        <DataTable
          columns={columns}
          rows={s.rows}
          selected={s.selected}
          onSelect={s.select}
          onRecord={() => {
            if (sample === null) return
            s.addRow({ sample: sample + 1, reading })
            setSample(null)
          }}
          onDelete={s.deleteRow}
          onClear={s.clearRows}
          canRecord={sample !== null && !recorded.includes(sample)}
        />
      }
    />
  )
}
