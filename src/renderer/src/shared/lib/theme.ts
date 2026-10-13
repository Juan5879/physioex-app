import { create } from 'zustand'

export const THEMES = ['dark', 'light'] as const
export type Theme = (typeof THEMES)[number]

const STORAGE_KEY = 'physioex.theme'

function storedTheme(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'dark' || v === 'light') return v
  } catch {
    // almacenamiento no disponible
  }
  return 'dark'
}

function apply(theme: Theme): void {
  document.documentElement.dataset.theme = theme
}

/** Tema claro/oscuro: se aplica como `data-theme` en <html> y se recuerda entre sesiones */
export const useTheme = create<{ theme: Theme; setTheme: (t: Theme) => void }>()((set) => {
  const initial = storedTheme()
  apply(initial)
  return {
    theme: initial,
    setTheme: (theme) => {
      apply(theme)
      try {
        localStorage.setItem(STORAGE_KEY, theme)
      } catch {
        // ignorar
      }
      set({ theme })
    }
  }
})
