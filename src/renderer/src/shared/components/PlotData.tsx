import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { niceAxisMax } from '@/shared/lib/format'
import type { DataColumn } from './DataTable'
import { Oscilloscope, ticks } from './Oscilloscope'
import { Button, Modal } from './ui'

interface PlotDataProps<Row> {
  title: string
  columns: DataColumn<Row>[]
  rows: Row[]
  /** ejes iniciales */
  defaultX: string
  defaultY: string
  onClose: () => void
}

/**
 * Herramienta "Plot Data" (plot_data.swf): grafica cualquier columna registrada
 * contra otra. Las escalas usan los mismos topes que f_setAxis del original.
 */
export function PlotData<Row>({
  title,
  columns,
  rows,
  defaultX,
  defaultY,
  onClose
}: PlotDataProps<Row>): ReactNode {
  const { t } = useTranslation()
  const [xKey, setXKey] = useState(defaultX)
  const [yKey, setYKey] = useState(defaultY)
  const xCol = columns.find((c) => c.key === xKey) ?? columns[0]
  const yCol = columns.find((c) => c.key === yKey) ?? columns[0]

  const points = rows
    .map((r) => ({ x: xCol.value(r), y: yCol.value(r) }))
    .sort((a, b) => a.x - b.x)
  const xMax = niceAxisMax(Math.max(0, ...points.map((p) => p.x)))
  const yMax = niceAxisMax(Math.max(0, ...points.map((p) => p.y)))

  const axisSelect = (label: string, value: string, onChange: (v: string) => void): ReactNode => (
    <label className="flex items-center gap-2 text-sm">
      <span className="font-semibold">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-bench-300 bg-bench-900 px-2 py-1"
      >
        {columns.map((c) => (
          <option key={c.key} value={c.key}>
            {typeof c.header === 'string' ? c.header : c.key}
          </option>
        ))}
      </select>
    </label>
  )

  return (
    <Modal title={`${t('common.plotData')} — ${title}`} onClose={onClose} wide>
      <div className="mb-3 flex flex-wrap gap-6">
        {axisSelect(t('common.xAxis'), xKey, setXKey)}
        {axisSelect(t('common.yAxis'), yKey, setYKey)}
      </div>
      {rows.length === 0 ? (
        <p className="py-10 text-center text-bench-300">{t('common.noData')}</p>
      ) : (
        <Oscilloscope
          xMax={xMax}
          yMax={yMax}
          xTicks={ticks(0, xMax, 10)}
          yTicks={ticks(0, yMax, 5)}
          xLabel={String(xCol.header)}
          yLabel={String(yCol.header)}
          series={[
            { id: 'line', color: '#4dd2ff', points },
            { id: 'dots', color: '#ffe14d', points, mode: 'dots' }
          ]}
        />
      )}
      <div className="mt-4 flex justify-end">
        <Button onClick={onClose}>{t('common.close')}</Button>
      </div>
    </Modal>
  )
}
