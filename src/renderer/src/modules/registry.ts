import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import muscleEs from './muscle/i18n/es.json'
import muscleEn from './muscle/i18n/en.json'
import cellTransportEs from './cellTransport/i18n/es.json'
import cellTransportEn from './cellTransport/i18n/en.json'
import nerveEs from './nerve/i18n/es.json'
import nerveEn from './nerve/i18n/en.json'
import endocrineEs from './endocrine/i18n/es.json'
import endocrineEn from './endocrine/i18n/en.json'
import cardioDynamicsEs from './cardioDynamics/i18n/es.json'
import cardioDynamicsEn from './cardioDynamics/i18n/en.json'
import frogCardioEs from './frogCardio/i18n/es.json'
import frogCardioEn from './frogCardio/i18n/en.json'
import respiratoryEs from './respiratory/i18n/es.json'
import respiratoryEn from './respiratory/i18n/en.json'
import digestionEs from './digestion/i18n/es.json'
import digestionEn from './digestion/i18n/en.json'
import renalEs from './renal/i18n/es.json'
import renalEn from './renal/i18n/en.json'
import acidBaseEs from './acidBase/i18n/es.json'
import acidBaseEn from './acidBase/i18n/en.json'
import bloodEs from './blood/i18n/es.json'
import bloodEn from './blood/i18n/en.json'
import serologyEs from './serology/i18n/es.json'
import serologyEn from './serology/i18n/en.json'
import histologyEs from './histology/i18n/es.json'
import histologyEn from './histology/i18n/en.json'

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
  /** material de consulta (atlas) en lugar de laboratorio: va en su propia sección del menú */
  reference?: boolean
}

/**
 * Lista de laboratorios. Para migrar uno nuevo: crear `modules/<id>/`, agregar su
 * componente (lazy) y sus traducciones aquí.
 */
export const labs: LabDefinition[] = [
  {
    id: 'cellTransport',
    number: 1,
    titleKey: 'labs.cellTransport',
    icon: '🧫',
    component: lazy(() => import('./cellTransport')),
    translations: { es: cellTransportEs, en: cellTransportEn }
  },
  {
    id: 'muscle',
    number: 2,
    titleKey: 'labs.muscle',
    icon: '💪',
    component: lazy(() => import('./muscle')),
    translations: { es: muscleEs, en: muscleEn }
  },
  {
    id: 'nerve',
    number: 3,
    titleKey: 'labs.nerve',
    icon: '⚡',
    component: lazy(() => import('./nerve')),
    translations: { es: nerveEs, en: nerveEn }
  },
  {
    id: 'endocrine',
    number: 4,
    titleKey: 'labs.endocrine',
    icon: '🧪',
    component: lazy(() => import('./endocrine')),
    translations: { es: endocrineEs, en: endocrineEn }
  },
  {
    id: 'cardioDynamics',
    number: 5,
    titleKey: 'labs.cardioDynamics',
    icon: '🫀',
    component: lazy(() => import('./cardioDynamics')),
    translations: { es: cardioDynamicsEs, en: cardioDynamicsEn }
  },
  {
    id: 'frogCardio',
    number: 6,
    titleKey: 'labs.frogCardio',
    icon: '🐸',
    component: lazy(() => import('./frogCardio')),
    translations: { es: frogCardioEs, en: frogCardioEn }
  },
  {
    id: 'respiratory',
    number: 7,
    titleKey: 'labs.respiratory',
    icon: '🫁',
    component: lazy(() => import('./respiratory')),
    translations: { es: respiratoryEs, en: respiratoryEn }
  },
  {
    id: 'digestion',
    number: 8,
    titleKey: 'labs.digestion',
    icon: '🍽️',
    component: lazy(() => import('./digestion')),
    translations: { es: digestionEs, en: digestionEn }
  },
  {
    id: 'renal',
    number: 9,
    titleKey: 'labs.renal',
    icon: '🩺',
    component: lazy(() => import('./renal')),
    translations: { es: renalEs, en: renalEn }
  },
  {
    id: 'acidBase',
    number: 10,
    titleKey: 'labs.acidBase',
    icon: '⚗️',
    component: lazy(() => import('./acidBase')),
    translations: { es: acidBaseEs, en: acidBaseEn }
  },
  {
    id: 'blood',
    number: 11,
    titleKey: 'labs.blood',
    icon: '🩸',
    component: lazy(() => import('./blood')),
    translations: { es: bloodEs, en: bloodEn }
  },
  {
    id: 'histology',
    number: 12,
    titleKey: 'labs.histology',
    icon: '🔬',
    reference: true,
    component: lazy(() => import('./histology')),
    translations: { es: histologyEs, en: histologyEn }
  },
  {
    id: 'serology',
    number: 13,
    titleKey: 'labs.serology',
    icon: '🧬',
    component: lazy(() => import('./serology')),
    translations: { es: serologyEs, en: serologyEn }
  }
]
