# Ejercicio 9 — Fisiología del sistema renal

Fuente: `PHYSIOEX/07_RenalSys/07_RenalSys.swf` (frames 5 y 15). Modelo en `model/renal.ts`.

- **Filtración glomerular**: radios aferente y eferente 0.1–0.6 mm, presión 70–100 mm Hg y válvula del
  conducto colector. Presión glomerular
  `(16·K3·e⁴ + P·K1·a⁴ + 12.4·45) / (K3·e⁴ + K1·a⁴ + 12.4)` con `K1 = 5`, `K3 = 1.935` y radios divididos por 0.5.
  TFG = flujo aferente − flujo eferente (≈125 ml/min con los valores iniciales);
  orina = `10·TFG/125 · 3500/flujo aferente`.
- **Formación de orina**: transportadores de glucosa 0–500 (glucosa en orina `6·(1 − c/350)`), gradiente
  medular 300–3000 mosm, ADH y aldosterona. Volumen `flujo·20100`, potasio `carga/flujo`. La concentración
  de la orina sólo se actualiza en los casos del original. La sonda mide el gradiente en cada segmento.

Diferencias: la sonda se usa con clic y también después de terminar la corrida; la animación de
filtración dura a lo sumo 10 s. Herramienta: Imprimir datos.
