import { Icon } from '@/shared/components/Icon'
import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/components/ui'
import data from './data/histology.json'

/** Datos generados por scripts/build-histology.mjs a partir de 12_HistologyT/xml */
interface Overlay {
  lines: number[][]
  circles: number[][]
  labels: Array<{ x: number; y: number; text: string }>
}
interface Item {
  title: string
  description: string
  image: string
  overlay: Overlay | null
}
interface TreeNode {
  label: string
  item?: string
  children?: TreeNode[]
}

const ITEMS = data.items as Record<string, Item>
const INDEX = data.index as TreeNode[]

/** hojas de una rama, en orden (para "anterior"/"siguiente") */
function leaves(nodes: TreeNode[]): TreeNode[] {
  return nodes.flatMap((n) => (n.item ? [n] : leaves(n.children ?? [])))
}

/** Ejercicio 12 de PhysioEx: atlas de histología con rótulos y descripciones */
export default function HistologyLab(): ReactNode {
  const { t } = useTranslation('histology')
  const [group, setGroup] = useState(0)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [current, setCurrent] = useState<string | null>(() => leaves(INDEX[0].children ?? [])[0]?.item ?? null)
  const [showLabels, setShowLabels] = useState(true)

  const groupLabel = (l: string): string => t(`groups.${l.trim()}`, { defaultValue: l.trim() })
  const branch = INDEX[group]?.children ?? []
  const list = useMemo(() => leaves(branch), [branch])
  const q = query.trim().toLowerCase()
  const found = q ? list.filter((n, i, a) => n.label.toLowerCase().includes(q) && a.findIndex((m) => m.item === n.item) === i) : null
  const pos = list.findIndex((n) => n.item === current)
  const item = current ? ITEMS[current] : null

  const renderNodes = (nodes: TreeNode[], path: string, depth: number): ReactNode =>
    nodes.map((n, i) => {
      const key = `${path}/${i}`
      if (n.item) {
        return (
          <button
            key={key}
            type="button"
            onClick={() => setCurrent(n.item ?? null)}
            aria-current={n.item === current ? 'true' : undefined}
            className={`block w-full truncate rounded-[var(--radius-sm)] py-1.5 pr-2 text-left text-[13px] ${n.item === current ? 'bg-[color:var(--accent-soft)] text-[color:var(--accent-ink)]' : 'text-[color:var(--ink)] hover:bg-[color:var(--surface-raised)]'}`}
            style={{ paddingLeft: 8 + depth * 12 }}
            title={n.label}
          >
            {n.label}
          </button>
        )
      }
      const isOpen = open[key] ?? false
      return (
        <div key={key}>
          <button
            type="button"
            onClick={() => setOpen((o) => ({ ...o, [key]: !isOpen }))}
            className="block w-full rounded-[var(--radius-sm)] py-1 pr-2 text-left font-mono text-[11px] tracking-[0.06em] text-[color:var(--ink-subtle)] uppercase hover:bg-[color:var(--surface-raised)]"
            style={{ paddingLeft: 8 + depth * 12 }}
          >
            {isOpen ? '▾' : '▸'} {groupLabel(n.label)}
          </button>
          {isOpen && renderNodes(n.children ?? [], key, depth + 1)}
        </div>
      )
    })

  return (
    <div className="px-container">
      <div className="px-labhead">
        <div>
          <div className="px-eyebrow">{t('eyebrow')}</div>
          <h1>{t('title')}</h1>
        </div>
      </div>
      <div className="px-tabs" role="tablist">
        {INDEX.map((g, i) => (
          <button
            key={g.label}
            type="button"
            role="tab"
            aria-selected={i === group}
            className="px-tab"
            onClick={() => {
              setGroup(i)
              setQuery('')
            }}
          >
            <span className="n">{String(i + 1).padStart(2, '0')}</span>
            {groupLabel(g.label)}
          </button>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-[280px_minmax(0,1fr)] items-start gap-4">
        <section className="px-panel flex h-[calc(100vh-260px)] min-h-[420px] flex-col gap-3 p-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search')}
            className="px-input"
          />
          <div className="min-h-0 flex-1 overflow-y-auto">
            {found ? (
              found.length ? (
                renderNodes(found, 'q', 0)
              ) : (
                <p className="px-empty">{t('noResults')}</p>
              )
            ) : (
              renderNodes(branch, String(group), 0)
            )}
          </div>
        </section>
        {item ? (
          <section className="px-panel">
            <div className="px-panel__head !min-h-12">
              <h2 className="m-0 flex-1 text-[15px] font-semibold">{item.title}</h2>
              <label className="flex items-center gap-2 text-[13px] text-[color:var(--ink-muted)]">
                <input
                  type="checkbox"
                  className="accent-[color:var(--accent)]"
                  checked={showLabels}
                  onChange={(e) => setShowLabels(e.target.checked)}
                  disabled={!item.overlay}
                />
                {t('labels')}
              </label>
              <Button size="sm" icon="chevronLeft" onClick={() => pos > 0 && setCurrent(list[pos - 1].item ?? null)} disabled={pos <= 0}>
                {t('previous')}
              </Button>
              <Button
                size="sm"
                onClick={() => pos >= 0 && pos < list.length - 1 && setCurrent(list[pos + 1].item ?? null)}
                disabled={pos < 0 || pos >= list.length - 1}
              >
                {t('next')}
                <Icon name="chevronRight" />
              </Button>
            </div>
            <div className="px-panel__body">
              <div className="px-well flex justify-center overflow-hidden">
                <svg viewBox="0 0 640 480" className="block aspect-[4/3] w-full max-w-[calc(56vh*4/3)]">
                  <image href={`histology/${encodeURIComponent(item.image)}`} width={640} height={480} />
                  {showLabels && item.overlay && (
                    <g>
                      {item.overlay.lines.map(([x1, y1, x2, y2], i) => (
                        <line key={`l${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#000" strokeWidth={2} />
                      ))}
                      {item.overlay.circles.map(([cx, cy, r], i) => (
                        <circle key={`c${i}`} cx={cx} cy={cy} r={r} fill="none" stroke="#000" strokeWidth={2} />
                      ))}
                      {item.overlay.labels.map((l, i) => (
                        <g key={`t${i}`}>
                          <rect x={l.x - 2} y={l.y} width={l.text.length * 7.4 + 6} height={19} fill="#fff" />
                          <text x={l.x + 1} y={l.y + 14} fontSize={14} fill="#000" fontFamily="Arial, sans-serif">
                            {l.text}
                          </text>
                        </g>
                      ))}
                    </g>
                  )}
                </svg>
              </div>
              <div>
                <p className="m-0 leading-relaxed whitespace-pre-line select-text">{item.description}</p>
                <p className="mt-2 mb-0 text-xs text-[color:var(--ink-subtle)]">{t('originalNote')}</p>
              </div>
            </div>
          </section>
        ) : (
          <section className="px-panel">
            <div className="px-empty">{t('pick')}</div>
          </section>
        )}
      </div>
    </div>
  )
}
