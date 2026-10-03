/**
 * Constantes del modelo de músculo esquelético.
 * Portadas literalmente de 02_MusclePhysio.swf (ActionScript 1, frames 5/20/35/50).
 */
export const K1 = 4.955
export const K2 = 0.045
export const K2_K1 = K2 * K1
/** Pendiente de reclutamiento por voltaje */
export const K3 = 4.5
/** Ganancia de la fuerza pasiva */
export const K4 = 1.75
/** Constante exponencial de la fuerza pasiva */
export const K5 = 7
/** Caída cuadrática de la fuerza activa con la longitud */
export const K7 = 0.0015

/** Voltaje umbral (V) */
export const THRESHOLD = 1.2
/** Voltaje máximo de reclutamiento (V) */
export const V_MAX = 8.3
/** Máximo voltaje seleccionable en el estimulador (V) */
export const V_DISPLAY_MAX = 10

export const L_MIN = 50
/** Longitud de reposo óptima (mm) */
export const L_NOM = 75
export const L_MAX = 100

/** Periodo de latencia (ms) */
export const LATENT = 3

/** Escalas de tiempo del osciloscopio (slider original de 9 posiciones), en ms */
export const TIME_SCALES = [200, 222, 250, 286, 333, 400, 500, 667, 1000] as const

/** Framerate original del SWF; los bucles de cálculo avanzan N pasos por frame */
export const SWF_FPS = 20
