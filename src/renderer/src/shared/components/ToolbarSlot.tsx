import { createContext, useContext, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

const ToolbarContext = createContext<HTMLElement | null>(null)

/**
 * Permite que cada experimento coloque su menú de herramientas en la barra
 * de encabezado del laboratorio (como el menú "Tools" del original).
 */
export function ToolbarHost({
  children,
  renderTarget
}: {
  children: ReactNode
  renderTarget: (ref: (el: HTMLElement | null) => void) => ReactNode
}): ReactNode {
  const [el, setEl] = useState<HTMLElement | null>(null)
  return (
    <ToolbarContext.Provider value={el}>
      {renderTarget(setEl)}
      {children}
    </ToolbarContext.Provider>
  )
}

export function ToolbarPortal({ children }: { children: ReactNode }): ReactNode {
  const el = useContext(ToolbarContext)
  return el ? createPortal(children, el) : null
}
