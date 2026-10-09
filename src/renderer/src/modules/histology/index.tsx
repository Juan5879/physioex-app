import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Panel } from '@/shared/components/ui'
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
            className={`block w-full truncate rounded px-2 py-0.5 text-left text-sm ${n.item === current ? 'bg-sky-700 text-white' : 'hover:bg-bench-800'}`}
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
            className="block w-full rounded px-2 py-0.5 text-left text-sm font-semibold text-bench-100 hover:bg-bench-800"
            style={{ paddingLeft: 8 + depth * 12 }}
          >
            {isOpen ? '▾' : '▸'} {groupLabel(n.label)}
          </button>
          {isOpen && renderNodes(n.children ?? [], key, depth + 1)}
        </div>
      )
    })

  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="flex flex-wrap items-end gap-x-4 border-b border-bench-600 px-3 pt-1.5">
        <h1 className="pb-1.5 text-lg font-bold">{t('title')}</h1>
        <nav className="flex flex-wrap gap-1">
          {INDEX.map((g, i) => (
            <button
              key={g.label}
              type="button"
              onClick={() => {
                setGroup(i)
                setQuery('')
              }}
              className={`rounded-t-lg px-3 py-1.5 text-sm font-semibold ${i === group ? 'bg-bench-700 text-white' : 'text-bench-300 hover:bg-bench-800 hover:text-white'}`}
            >
              {groupLabel(g.label)}
            </button>
          ))}
        </nav>
      </div>
      <div className="grid grid-cols-[300px_minmax(0,1fr)] gap-3 p-3">
        <Panel className="flex h-[calc(100vh-130px)] flex-col gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search')}
            className="rounded border border-bench-500 bg-bench-900 px-2 py-1 text-sm select-text"
          />
          <div className="min-h-0 flex-1 overflow-y-auto">
            {found
              ? found.length
                ? renderNodes(found, 'q', 0)
                : <p className="p-2 text-sm text-bench-300">{t('noResults')}</p>
              : renderNodes(branch, String(group), 0)}
          </div>
        </Panel>
        <div className="flex min-w-0 flex-col gap-3">
          {item ? (
            <>
              <Panel className="flex flex-wrap items-center gap-3">
                <h2 className="flex-1 text-lg font-semibold">{item.title}</h2>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} disabled={!item.overlay} />
                  {t('labels')}
                </label>
                <Button onClick={() => pos > 0 && setCurrent(list[pos - 1].item ?? null)} disabled={pos <= 0}>
                  ◀ {t('previous')}
                </Button>
                <Button onClick={() => pos >= 0 && pos < list.length - 1 && setCurrent(list[pos + 1].item ?? null)} disabled={pos < 0 || pos >= list.length - 1}>
                  {t('next')} ▶
                </Button>
              </Panel>
              <div className="relative overflow-hidden rounded-xl border-4 border-gray-500 bg-black">
                <svg viewBox="0 0 640 480" className="mx-auto block max-h-[58vh] w-full">
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
              <Panel>
                <p className="leading-relaxed whitespace-pre-line text-bench-50 select-text">{item.description}</p>
                <p className="mt-2 text-xs text-bench-300">{t('originalNote')}</p>
              </Panel>
            </>
          ) : (
            <Panel>{t('pick')}</Panel>
          )}
        </div>
      </div>
    </div>
  )
}
