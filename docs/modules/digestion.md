# Ejercicio 8 — Procesos químicos y físicos de la digestión

Fuente: `PHYSIOEX/05_Digestion/05_Digestion.swf` (`frame_2/DoAction_3.as`: objeto `tube`; `DoAction_5.as`:
pruebas). Modelo en `model/digestion.ts`; los tres experimentos usan `experiments/DigestionExperiment.tsx`.

- Amilasa (3 reactivos por tubo; Lugol y Benedict), pepsina (3; densidad óptica del BAPNA) y lipasa
  (4; pH final). No se repite un tipo de reactivo en un tubo.
- Al agregar sustrato su concentración es 5. Cada minuto de incubación:
  `Δ = sustrato · 0.07 · f_temp · f_pH` (lipasa sin sales biliares ×0.1). `f_temp = 0` desde 68 °C y con
  peptidasa, amilasa + celulosa o bacterias + almidón; si no, `max(0.01, 1 − |37 − T|/15)`. `f_pH` depende
  del pH óptimo de cada enzima (7, 2 y 7). Bacterias + celulosa: degradación a los 10, 20 y 30 min si
  30–40 °C y pH 7.
- Resultados: Lugol + si queda almidón ≥ 0.1; Benedict + si hay producto ≥ 0.1; DO = 0.4·producto/5;
  pH = pH del tampón − 0.8·producto/5. Hervir antes de incubar inactiva la enzima.
- Temporizador 5–90 min; temperatura −30 a 100 °C (pepsina 5 a 100).

Diferencias: la incubación avanza 1 minuto cada 2 frames (el original tardaba 1 s real por minuto); tubos
y goteros se usan con clic. Herramienta: Imprimir datos.
