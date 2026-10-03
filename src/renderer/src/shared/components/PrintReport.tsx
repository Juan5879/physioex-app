import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { shortDate } from '@/shared/lib/format'
import { printWindow, savePdf } from '@/shared/lib/printing'
import { Button, Modal } from './ui'

const NAME_PATTERN = /^[\p{L}\p{N} ]+$/u
const NAME_KEY = 'physioex.studentName'

function storedName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? ''
  } catch {
    return ''
  }
}

interface PrintReportProps {
  /** título del laboratorio */
  lab: string
  /** nombre del experimento */
  experiment: string
  /** contenido a imprimir (tabla o gráfica en versión clara) */
  children: ReactNode
  onDone: () => void
}

/**
 * Pide el nombre del alumno (como el original) y genera una hoja imprimible
 * con encabezado; permite imprimir o guardar como PDF.
 */
export function PrintReport({ lab, experiment, children, onDone }: PrintReportProps): ReactNode {
  const { t, i18n } = useTranslation()
  const [name, setName] = useState(storedName)
  const [job, setJob] = useState<'print' | 'pdf' | null>(null)
  const valid = NAME_PATTERN.test(name.trim())

  // refs para que el efecto de impresión corra una sola vez por trabajo
  const latest = useRef({ onDone, fileName: '' })
  latest.current = { onDone, fileName: `${experiment} - ${name.trim()}.pdf` }

  useEffect(() => {
    if (!job) return
    const run = async (): Promise<void> => {
      if (job === 'print') await printWindow()
      else await savePdf(latest.current.fileName)
      latest.current.onDone()
    }
    run()
  }, [job])

  const start = (kind: 'print' | 'pdf'): void => {
    try {
      localStorage.setItem(NAME_KEY, name.trim())
    } catch {
      // ignorar
    }
    setJob(kind)
  }

  return (
    <>
      {!job && (
        <Modal title={t('common.enterName')} onClose={onDone}>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && valid && start('print')}
            className="w-full rounded border border-bench-300 bg-white px-3 py-2 text-black"
          />
          <p className={`mt-1 text-xs ${valid || !name ? 'text-bench-300' : 'text-rose-400'}`}>
            {t('common.nameHint')}
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={onDone}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => start('pdf')} disabled={!valid}>
              {t('common.savePdf')}
            </Button>
            <Button variant="primary" onClick={() => start('print')} disabled={!valid}>
              {t('common.print')}
            </Button>
          </div>
        </Modal>
      )}
      {job &&
        createPortal(
          <div className="print-only p-8 text-black">
            <h1 className="text-xl font-bold">{lab}</h1>
            <p className="mb-1">
              <b>{t('common.experiment')}:</b> {experiment}
            </p>
            <p className="mb-1">
              <b>{t('common.name')}:</b> {name.trim()}
            </p>
            <p className="mb-4">
              <b>{t('common.date')}:</b> {shortDate(i18n.language)}
            </p>
            {children}
          </div>,
          document.body
        )}
    </>
  )
}

/** Tabla en blanco y negro para la hoja impresa */
export function PrintTable({
  headers,
  rows
}: {
  headers: ReactNode[]
  rows: string[][]
}): ReactNode {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr>
          {headers.map((h, i) => (
            <th key={i} className="border border-black px-2 py-1">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) => (
              <td key={j} className="border border-black px-2 py-1 text-center">
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
