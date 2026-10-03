import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import es from './es.json'
import en from './en.json'
import { labs } from '@/modules/registry'

export const LANGUAGES = ['es', 'en'] as const
export type Language = (typeof LANGUAGES)[number]

const STORAGE_KEY = 'physioex.lang'

function storedLanguage(): Language {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'es' || v === 'en') return v
  } catch {
    // almacenamiento no disponible
  }
  return 'es'
}

// Cada laboratorio aporta su propio namespace de traducciones
const resources: Record<Language, Record<string, object>> = {
  es: { translation: es },
  en: { translation: en }
}
for (const lab of labs) {
  if (!lab.translations) continue
  resources.es[lab.id] = lab.translations.es
  resources.en[lab.id] = lab.translations.en
}

i18n.use(initReactI18next).init({
  resources,
  lng: storedLanguage(),
  fallbackLng: 'es',
  interpolation: { escapeValue: false }
})

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng
  try {
    localStorage.setItem(STORAGE_KEY, lng)
  } catch {
    // ignorar
  }
})

export default i18n
