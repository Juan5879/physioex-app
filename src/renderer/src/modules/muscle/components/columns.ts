import type { TFunction } from 'i18next'
import type { DataColumn } from '@/shared/components/DataTable'
import { fixed } from '@/shared/lib/format'
import type { ForceRow, IsotonicRow, MultipleRow } from '../store'

/** Columnas de las tablas de datos, en el mismo orden que el original */
export function forceColumns(t: TFunction): DataColumn<ForceRow>[] {
  return [
    { key: 'voltage', header: t('fields.voltage'), value: (r) => r.voltage, format: (r) => fixed(r.voltage, 1) },
    { key: 'length', header: t('fields.length'), value: (r) => r.length, format: (r) => String(r.length) },
    { key: 'active', header: t('fields.active'), value: (r) => r.active, format: (r) => fixed(r.active) },
    { key: 'passive', header: t('fields.passive'), value: (r) => r.passive, format: (r) => fixed(r.passive) },
    { key: 'total', header: t('fields.total'), value: (r) => r.total, format: (r) => fixed(r.total) }
  ]
}

export function multipleColumns(t: TFunction): DataColumn<MultipleRow>[] {
  const [voltage, length, ...forces] = forceColumns(t) as unknown as DataColumn<MultipleRow>[]
  return [
    voltage,
    length,
    { key: 'rate', header: t('fields.stimRate'), value: (r) => r.rate, format: (r) => String(r.rate) },
    ...forces
  ]
}

export function isotonicColumns(t: TFunction): DataColumn<IsotonicRow>[] {
  const [voltage, , ...forces] = forceColumns(t) as unknown as DataColumn<IsotonicRow>[]
  return [
    voltage,
    { key: 'length', header: t('fields.length'), value: (r) => r.length, format: (r) => fixed(r.length, 1) },
    { key: 'weight', header: t('fields.weight'), value: (r) => r.weight, format: (r) => fixed(r.weight, 1) },
    { key: 'velocity', header: t('fields.velocity'), value: (r) => r.velocity, format: (r) => fixed(r.velocity) },
    ...forces
  ]
}
