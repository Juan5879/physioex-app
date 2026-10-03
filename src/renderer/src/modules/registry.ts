import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import muscleEs from './muscle/i18n/es.json'
import muscleEn from './muscle/i18n/en.json'

export interface LabDefinition {
  /** identificador y namespace de i18n */
  id: string
  /** número de ejercicio en PhysioEx 6 */
  number: number
  /** clave de título en el namespace común (labs.*) */
  titleKey: string
  /** emoji/ícono simple para la tarjeta */
  icon: string
  /** componente raíz; sin componente = aún no migrado */
  component?: LazyExoticComponent<ComponentType>
  translations?: { es: object; en: object }
}

/**
 * Lista de laboratorios. Para migrar uno nuevo: crear `modules/<id>/`, agregar su
 * componente (lazy) y sus traducciones aquí.
 */
export const labs: LabDefinition[] = [
  { id: 'cellTransport', number: 1, titleKey: 'labs.cellTransport', icon: '🧫' },
  {
    id: 'muscle',
    number: 2,
    titleKey: 'labs.muscle',
    icon: '💪',
    component: lazy(() => import('./muscle')),
    translations: { es: muscleEs, en: muscleEn }
  },
  { id: 'nerve', number: 3, titleKey: 'labs.nerve', icon: '⚡' },
  { id: 'endocrine', number: 4, titleKey: 'labs.endocrine', icon: '🧪' },
  { id: 'cardioDynamics', number: 5, titleKey: 'labs.cardioDynamics', icon: '🫀' },
  { id: 'frogCardio', number: 6, titleKey: 'labs.frogCardio', icon: '🐸' },
  { id: 'respiratory', number: 7, titleKey: 'labs.respiratory', icon: '🫁' },
  { id: 'digestion', number: 8, titleKey: 'labs.digestion', icon: '🍽️' },
  { id: 'renal', number: 9, titleKey: 'labs.renal', icon: '🩺' },
  { id: 'acidBase', number: 10, titleKey: 'labs.acidBase', icon: '⚗️' },
  { id: 'blood', number: 11, titleKey: 'labs.blood', icon: '🩸' },
  { id: 'histology', number: 12, titleKey: 'labs.histology', icon: '🔬' },
  { id: 'serology', number: 13, titleKey: 'labs.serology', icon: '🧬' }
]
