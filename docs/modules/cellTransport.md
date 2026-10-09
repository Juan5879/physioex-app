# Ejercicio 1 — Mecanismos de transporte celular y permeabilidad

Fuente: `PHYSIOEX/01_CellTran/01_CellTran.swf` (Flash, ActionScript 1, 20 fps). Decompilado con JPEXS FFDec
en `extracted/01_CellTran/scripts/`; casi toda la lógica está en `frame_2/DoAction_2.as` (corridas),
`frame_2/DoAction.as` (cálculos) y `frame_2/DoAction_3.as` (tabla de datos).

| Experimento | Frame SWF | Prefijo AS | Archivo nuevo |
| --- | --- | --- | --- |
| Difusión simple | 5 | `sd` | `experiments/BeakerExperiment.tsx` |
| Difusión facilitada | 15 | `fd` | `experiments/BeakerExperiment.tsx` |
| Ósmosis | 25 | `os` | `experiments/BeakerExperiment.tsx` |
| Filtración | 35 | `fl` | `experiments/Filtration.tsx` |
| Transporte activo | 45 | `at` | `experiments/BeakerExperiment.tsx` |

## Constantes (`model/constants.ts`)

| Soluto | difCo | MWCO mínimo |
| --- | --- | --- |
| Na⁺/Cl⁻ | 0.01 | 50 |
| Urea | 0.006305 | 100 |
| Albúmina | 0 | 500 (nunca pasa) |
| Glucosa | 0.0026395 | 200 |
| Na⁺ (transp. activo) | 0.01 | — |
| K⁺ (transp. activo) | 0.00809 | — |

Membranas de 20, 50, 100 y 200 MWCO. `etime = 30`. Concentraciones 0–20 (pasos de 1), temporizador
5–300 min (pasos de 5, inicia en 60), transportadores y bombas 0–1000 (pasos de 50, inicia en 500),
ATP 0–20, presión 0–100 mm Hg (pasos de 5, inicia en 50). El reloj avanza 1 minuto cada 10 frames
(medio segundo real).

## Cálculos por minuto (`model/transport.ts`)

- **Difusión simple** (`f_simpleDiffusionCalc`): `rate = |C_L − C_R|·difCo`; cada lado cambia
  `rate·30`. Si `rate` redondeado a 4 decimales es 0, ambos lados pasan al promedio y se anota el minuto
  de equilibrio. Sólo difunden los solutos con `MWCO ≥ minMWCO`.
- **Difusión facilitada** (`f_carriersCalc`): `rate = min(6, |ΔC|)·difCo_glucosa·1.2·(transportadores/1000)`.
  El NaCl difunde siempre con su difCo.
- **Ósmosis** (`f_osCalc`): con los valores dispensados,
  `efecto = 34·ΔNaCl (si no pasa) + 17·ΔGlucosa (si no pasa) + 17·ΔAlbúmina`; la presión crece
  linealmente hasta `efecto` a los 12 min (42 si la glucosa difunde con concentraciones distintas)
  y se muestra en el vaso con más soluto.
- **Transporte activo** (`f_transportCalc`): con `efecto = bombas/1000`,
  `rate_Na = Na_L·0.01·1.2·efecto`, `rate_K = K_R·0.00809·1.2·efecto`, acoplados 3:2 al menor;
  Na⁺ pasa de izquierda a derecha, K⁺ de derecha a izquierda, y se gasta `ΔNa/3` de ATP. Se detiene
  cuando se acaba el Na⁺ izquierdo, el K⁺ derecho o el ATP. La glucosa usa los transportadores.
- **Velocidad media** = suma de velocidades / minuto de equilibrio (o minutos transcurridos).
- **Filtración** (`model/filtration.ts`): `velocidad = presión·MWCO·0.001` ml/min, tarda `100/velocidad`
  min; en el filtrado pasa 96.2 % del NaCl (MWCO ≥ 50), 94.8 % de la urea (≥ 100), 87.9 % de la glucosa
  (≥ 200) y nada de carbón. El análisis de residuos marca "presente" todo soluto que había en el vaso.

## Flujo de la corrida

- Iniciar exige los dos vasos llenos, membrana en el soporte y que no estén ambos con solución vieja.
- "Pausa" detiene la corrida si ya no se mueve ningún soluto; si no, la pausa y muestra las velocidades.
- Al terminar aparece el resumen (equilibrio a los N min, sin difusión, etc.) y se habilita
  "Registrar datos". Cambiar cualquier control, la membrana o vaciar un vaso lo desactiva.
- Al vaciar un vaso, el otro conserva su solución y sus controles muestran la concentración actual.
  En transporte activo se vacían los dos y el ATP.
- Filtración: al terminar hay que correr el análisis de residuos antes de vaciar o filtrar de nuevo;
  "Detener" a mitad de la corrida la descarta y vacía el vaso.
- Las corridas se registran como en el original: una fila por soluto; `#` marca que la corrida terminó
  antes del equilibrio.

## Herramientas

El original sólo tenía **Imprimir datos** (una tabla por corrida). No había "Graficar datos".

## Diferencias intencionales

- Las membranas se colocan con clic o arrastre; el constructor de membrana pone la membrana
  directamente en el soporte ("Quitar membrana" la devuelve).
- La lista de corridas hace scroll en lugar de mostrar 4 con flechas.
- Se omitieron "Balloon help", el control de volumen y la calculadora.
