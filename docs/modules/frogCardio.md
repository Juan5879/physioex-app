# Ejercicio 6 — Fisiología cardiovascular de la rana

Fuente: `PHYSIOEX/04_FrogCardio/04_FrogCardio.swf` (Flash, ActionScript 1, 20 fps). Decompilado con JPEXS
FFDec en `extracted/04_FrogCardio/scripts/`; el modelo está en `frame_2/DoAction_3.as` (`param`, `heartState`,
`heartSim`) y `DoAction_4.as` (`heartMaster`, Ringer).

| Experimento | Frame SWF | Prefijo AS | Archivo nuevo |
| --- | --- | --- | --- |
| Estimulación eléctrica | 5 | `es` | `experiments/ElectricalStimulation.tsx` |
| Modificadores de la frecuencia cardíaca | 15 | `mr` | `experiments/HeartModifiers.tsx` |

## Modelo (`model/heart.ts`)

- Frecuencia normal `r_nom = 58 + ceil(random·4)` (59–62 lpm). Aurícula 1, ventrículo 4.
- Máquina de estados por latido: contracción auricular (AC) → relajación (AR) → contracción ventricular (VC)
  → relajación (VR, VRstim) → latencia (L). Duraciones `escala · r_nom / frecuencia`, con escalas 0.2, 0.2,
  0.3 y 0.29, acotadas por la frecuencia de cambio (0.66 · r_nom).
- Entre estados la curva sigue un polinomio cúbico que parte con la velocidad actual (`heartSim`).
- La frecuencia, la aurícula y el ventrículo se acercan a su objetivo con constante de tiempo de 2 s
  (10 s durante la estimulación vagal).
- Estado mostrado: normal / estable / cambiando, con tolerancia de 2 % de `r_nom`.
- Pantalla de 450 puntos para 10 o 15 s ("Modify Display"); 4 puntos por frame.

## Estimulación eléctrica

- **Electrodo sobre el corazón** (20 V, 1–20 estímulos/s): un estímulo en la latencia o al final de la
  relajación produce una **extrasístole** seguida de una **pausa compensatoria** (`60/frecuencia·(1+random)`).
  Los estímulos múltiples suben la frecuencia hasta 1.1 · r_nom (entre 2 y 10 estímulos/s) y cada estímulo
  tiene 1/7 de probabilidad de provocar una extrasístole.
- **Electrodo sobre el vago** (1 V, 1–50 estímulos/s): frecuencia objetivo `r_nom − 1.06·estímulos`. Si cae por
  debajo de 0.3 · r_nom el corazón se detiene (bloqueo vagal, 0.12 · r_nom s) y luego escapa a 0.83 · r_nom.

## Modificadores

| Agente | Aurícula | Ventrículo | Frecuencia | Arritmia |
| --- | --- | --- | --- | --- |
| Ringer 5° | 1 | 1 | 0.83 | |
| Ringer 32° | 1 | 1 | 1.17 | |
| Pilocarpina | 1 | 1 | 0.75 | |
| Atropina | 1 | 1 | 1.17 | |
| Epinefrina | 1.1 | 1.1 | 1.33 | |
| Digital | 1 | 1 | 0.69 | |
| Calcio | 1.1 | 1.1 | 0.93 | sí |
| Sodio | 0.9 | 0.9 | 0.917 | sí |
| Potasio | 0 | 0.5 | 0.917 | sí, y a veces el ventrículo late solo |

- Los goteros, el Ringer a 5° y a 32° y el registro se habilitan con la frecuencia normal; con la frecuencia
  estable (no normal) sólo el Ringer a 23°. El lavado con Ringer son 15 gotas (12.5 s).
- A los 2 minutos de un fármaco se lava solo con Ringer a 23°.
- Se registra la solución y la **frecuencia objetivo redondeada** (`mrHeartRate`), como el original.

## Herramientas

El original sólo tenía **Modify Display** (10 s o 15 s); no tenía impresión.

## Diferencias intencionales

- Los electrodos y goteros se aplican con clic.
- Tras el bloqueo vagal el original no recalculaba la duración de la contracción auricular (quedaba la del
  bloqueo); aquí se usa la duración normal.
- Los temporizadores del original medían tiempo real (`getTimer`); aquí cuentan frames a 20 fps.
