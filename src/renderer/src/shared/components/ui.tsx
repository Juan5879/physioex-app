import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { splitUnit } from '@/shared/lib/format'
import { HeaderText } from './DataTable'
import { Icon, type IconName } from './Icon'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'px-btn--primary',
  secondary: '',
  danger: 'px-btn--danger',
  ghost: 'px-btn--ghost'
}

/** Botón del rediseño (`.px-btn`). Una sola acción `primary` por panel. */
export function Button({
  variant = 'secondary',
  size,
  icon,
  block = false,
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: 'sm'
  icon?: IconName
  block?: boolean
}): ReactNode {
  const cls = ['px-btn', VARIANTS[variant], size === 'sm' && 'px-btn--sm', block && 'px-btn--block', className]
  return (
    <button type="button" className={cls.filter(Boolean).join(' ')} {...props}>
      {icon && <Icon name={icon} />}
      {children}
    </button>
  )
}

/**
 * Panel (`.px-panel`). Con `title` lleva encabezado (y `actions` a la derecha) y el contenido va en
 * `.px-panel__body`; sin título es una caja con relleno cuyo contenido se acomoda con `className`.
 */
export function Panel({
  title,
  actions,
  className = '',
  bodyClassName = '',
  children
}: {
  title?: ReactNode
  actions?: ReactNode
  className?: string
  bodyClassName?: string
  children: ReactNode
}): ReactNode {
  if (title === undefined) {
    return <section className={`px-panel p-4 ${className}`}>{children}</section>
  }
  return (
    <section className={`px-panel ${className}`}>
      <div className="px-panel__head">
        <span className="px-panel__title">{title}</span>
        {actions}
      </div>
      <div className={`px-panel__body ${bodyClassName}`}>{children}</div>
    </section>
  )
}

/** Visor LCD de solo lectura (`.px-readout--boxed`). Vacío muestra «——». */
export function Readout({
  value,
  unit,
  className = '',
  dim = false,
  text = false
}: {
  value: string
  unit?: string
  className?: string
  dim?: boolean
  /** visor con texto («Normal», «Frecuencia normal») en lugar de número */
  text?: boolean
}): ReactNode {
  const empty = !value.trim() || /^-+$/.test(value.trim())
  const cls = ['px-readout', 'px-readout--boxed', text && 'px-readout--text', (empty || dim) && 'is-empty', className]
  return (
    <output className={cls.filter(Boolean).join(' ')}>
      {empty ? '——' : value}
      {unit && !empty && <span className="u">{unit}</span>}
    </output>
  )
}

/** Indicador luminoso con su palabra al lado («En curso» / «Detenido» por defecto) */
export function Light({ on, label }: { on: boolean; label?: ReactNode }): ReactNode {
  const { t } = useTranslation()
  return (
    <span className={`px-status ${on ? 'is-on' : ''}`}>
      <span className={`px-led ${on ? 'is-on' : ''}`} />
      {label ?? (on ? t('common.inProgress') : t('common.stopped'))}
    </span>
  )
}

/** Campo con rótulo (`.px-field`) */
export function Field({ label, children, className = '' }: { label: ReactNode; children: ReactNode; className?: string }): ReactNode {
  return (
    <div className={`px-field ${className}`}>
      <span className="px-label">{label}</span>
      {children}
    </div>
  )
}

/** Instrucción breve con ícono de información (`.px-hint`) */
export function Hint({ children }: { children: ReactNode }): ReactNode {
  return (
    <p className="px-hint m-0">
      <Icon name="info" />
      {children}
    </p>
  )
}

export function Modal({
  title,
  onClose,
  children,
  wide = false
}: {
  title: ReactNode
  onClose: () => void
  children: ReactNode
  wide?: boolean
}): ReactNode {
  return (
    <div
      className="px-modal no-print"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
      }}
    >
      <div role="dialog" aria-modal="true" className={`px-modal__box ${wide ? 'px-modal__box--wide' : ''}`}>
        <h2 className="px-modal__title">{title}</h2>
        {children}
      </div>
    </div>
  )
}

/** Aviso con botón Aceptar (los cuadros de alerta del original) */
export function Notice({
  title,
  lines,
  onClose
}: {
  title: ReactNode
  lines: ReactNode[]
  onClose: () => void
}): ReactNode {
  return (
    <Modal title={title} onClose={onClose}>
      <div className="px-modal__text">
        {lines.map((l, i) => (
          <p key={i}>{l}</p>
        ))}
      </div>
      <div className="px-modal__actions">
        <Button variant="primary" autoFocus onClick={onClose}>
          OK
        </Button>
      </div>
    </Modal>
  )
}

/** Control segmentado (`.px-seg`): una opción activa entre pocas */
export function Seg<T extends string | number>({
  options,
  value,
  onChange,
  label,
  disabled = false
}: {
  options: Array<{ value: T; label: ReactNode }>
  value: T | null
  onChange: (v: T) => void
  label: string
  disabled?: boolean
}): ReactNode {
  return (
    <div className="px-seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          aria-pressed={value === o.value}
          disabled={disabled}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/**
 * Tabla chica de dos o más columnas (soluto / valor, etc.) con estado vacío. La primera columna es
 * texto; las demás, numéricas. Con `rows === null` muestra `empty`.
 */
export function MiniTable({
  headers,
  rows,
  empty
}: {
  headers: ReactNode[]
  rows: ReactNode[][] | null
  empty: ReactNode
}): ReactNode {
  return (
    <div className="px-tablewrap">
      <table className="px-table">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} className={i > 0 ? 'num' : undefined}>
                <HeaderText>{h}</HeaderText>
              </th>
            ))}
          </tr>
        </thead>
        {rows && (
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j} className={j > 0 ? 'num' : undefined}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        )}
      </table>
      {!rows && <div className="px-empty">{empty}</div>}
    </div>
  )
}

/** Frasco, jeringa o tubo seleccionable (`.px-reagent`) con el color del contenido */
export function Reagent({
  color,
  label,
  detail,
  pressed,
  className = '',
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'> & {
  color: string
  label: ReactNode
  detail?: ReactNode
  pressed?: boolean
}): ReactNode {
  return (
    <button
      type="button"
      className={`px-reagent disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
      aria-pressed={pressed}
      style={{ '--c': color } as CSSProperties}
      {...props}
    >
      <svg viewBox="0 0 14 24" aria-hidden="true">
        <path className="vessel" d="M4 1h6v5l2.5 4v11.5a1.5 1.5 0 0 1-1.5 1.5H3a1.5 1.5 0 0 1-1.5-1.5V10L4 6z" />
        <path className="fill" d="M2.5 13h9v8.5a.5.5 0 0 1-.5.5H3a.5.5 0 0 1-.5-.5z" />
      </svg>
      <span>
        {label}
        {detail && <small>{detail}</small>}
      </span>
    </button>
  )
}

/** Lista seleccionable de conjuntos o corridas (`.px-setlist`) con su rótulo encima */
export function SetList({
  label,
  items,
  selected,
  onSelect,
  empty
}: {
  label: string
  items: Array<{ key: string | number; label: ReactNode; count?: number }>
  selected: string | number | null
  onSelect: (key: string | number) => void
  empty?: ReactNode
}): ReactNode {
  return (
    <div className="px-results__side">
      <span className="px-label">{label}</span>
      <div className="px-setlist" role="listbox" aria-label={label}>
        {items.map((it) => (
          <button
            key={it.key}
            type="button"
            role="option"
            aria-selected={it.key === selected}
            onClick={() => onSelect(it.key)}
          >
            <span className="truncate">{it.label}</span>
            {it.count !== undefined && <span className="c">{it.count}</span>}
          </button>
        ))}
        {items.length === 0 && empty && <div className="px-empty">{empty}</div>}
      </div>
    </div>
  )
}

/**
 * Visor de solo lectura con rótulo. La unidad final del rótulo («Flujo (ml/min)») pasa al visor;
 * `inline` lo pone en una fila (rótulo a la izquierda, visor a la derecha).
 */
export function ReadoutField({
  label,
  value,
  unit,
  inline = false,
  text = false,
  className = ''
}: {
  label: string
  value: string
  unit?: string
  inline?: boolean
  text?: boolean
  className?: string
}): ReactNode {
  const split = splitUnit(label)
  const shownLabel = split ? split.text : label
  const shownUnit = unit ?? split?.unit
  const readout = <Readout value={value} unit={shownUnit} text={text} />
  if (inline) {
    return (
      <div className={`px-row ${className}`}>
        <span className="px-label">{shownLabel}</span>
        {readout}
      </div>
    )
  }
  return (
    <Field label={shownLabel} className={className}>
      {readout}
    </Field>
  )
}
