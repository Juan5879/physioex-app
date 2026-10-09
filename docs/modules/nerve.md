# Ejercicio 3 — Neurofisiología de los impulsos nerviosos

Fuente: `PHYSIOEX/09_NeuroNerve/09_NeuroNerve.swf` (Flash, ActionScript 1, 20 fps). Decompilado con
JPEXS FFDec en `extracted/09_NeuroNerve/scripts/`. La lógica está en `frame_1/DoAction.as`
(estimuladores) y en el `onClipEvent(load)` del monitor de cada experimento.

| Experimento | Frame SWF | Prefijo AS | Archivo nuevo |
| --- | --- | --- | --- |
| Provocar un impulso nervioso | 5 | `eni` | `experiments/Eliciting.tsx` |
| Inhibir un impulso nervioso | 15 | `ini` | `experiments/Inhibiting.tsx` |
| Velocidad de conducción nerviosa | 25 | `ncv` | `experiments/Conduction.tsx` |

## Modelo (`model/nerve.ts`)

- **Forma del potencial de acción** (`f_makeGompertz`): 540 puntos con `t = −4.5 + i/36`,
  `g(t) = cos(6.28·14^(−10000·14^(−0.7(t+4.2))) − 3 + 0.7854)`. En reposo vale −0.6002.
- La pantalla tiene 360 px (36 por división). Un potencial de acción de amplitud `A` y retardo `d`
  es `A·g[i + round((4.5 − d)·36)]` para cada píxel `i`; el pico cae en ≈ `d + 0.8` divisiones.
- **Estímulo eléctrico** (`f_elecStim`): bajo el umbral, línea plana en `ampLow·(−0.6)`; entre el umbral
  y `vMax` la amplitud crece linealmente de `ampLow` a `ampMax`.
  Experimentos 1 y 2: umbral 3 V, `vMax` 4 V, amplitud 40–45, retardo 2.5 ms.
- **Nervios** (velocidad de conducción):

  | Nervio | Umbral (V) | vMax (V) | Retardo (ms) |
  | --- | --- | --- | --- |
  | Lombriz | 5 | 6 | 4.5 |
  | Rana | 3 | 4 | 1.2 |
  | Rata 1 | 2.5 | 3.5 | 2.1 |
  | Rata 2 | 3 | 4 | 0.5 |

- **Velocidad de conducción** = 43 mm / tiempo medido (ms) → m/s.
- **Estímulos repetidos**: en escala de segundos o minutos cada potencial de acción se dibuja como una
  línea vertical de ±A al inicio de cada periodo (`36/estímulos por s` o `36·intervalo` px).

## Experimentos

- **Provocar**: estímulo único (sólo en escala ms) o múltiples (sólo en escala s, 1–15 estímulos/s,
  3 px por frame). NaCl, HCl y la varilla de vidrio dan un potencial de amplitud 40; la varilla caliente,
  43. Las gotas ensucian el nervio y hay que limpiarlo antes de aplicar otro reactivo.
- **Inhibir**: lidocaína y éter bloquean el potencial; el curare no (actúa en la unión neuromuscular).
  Con intervalo > 0 (escala en minutos) los estímulos se repiten 1 px por frame hasta "Detener";
  el éter deja de bloquear a los 5 minutos.
- **Velocidad de conducción**: hay que aplicar etanol a la lombriz antes de colocarla, encender el
  bioamplificador y pulsar "Pulso" antes de estimular. "Medir" muestra una línea que se mueve
  1/36 ms por clic; la tabla admite 4 filas.

## Herramientas

El original tenía **Imprimir datos** e **Imprimir gráfica**. No había "Graficar datos".

## Diferencias intencionales

- Los reactivos, la varilla y los nervios se aplican con clic o arrastre.
- El trazo usa los colores alternados del resto de la app (el original alternaba verde y rosa).
- En la tabla de velocidad de conducción se muestra el nombre del nervio (el original mostraba su
  identificador interno, p. ej. `rat1`).
- Se omitieron "Balloon help", el control de volumen y la calculadora.
