# Ejercicio 10 — Equilibrio ácido-base

Fuente: `PHYSIOEX/11_AcidBase/11_AcidBase.swf` (frames 5, 15 y 25). Modelo en `model/acidBase.ts`.

- **Acidosis y alcalosis respiratorias**: la hiperventilación y la reinhalación recorren las tablas de PCO₂
  y pH del original según los ciclos respiratorios. Al volver a la normalidad tras hiperventilar aparece la
  apnea del original. El pH lleva el ruido `−0.02 + random(4)/100`.
- **Acidosis y alcalosis metabólicas**: tasa metabólica 20–80 (13 valores); respiraciones por minuto, pH,
  PCO₂, H⁺ y HCO₃⁻ salen de tablas.
- **Compensación renal**: PCO₂ (8 valores) → H⁺ y HCO₃⁻ en orina (disminuido, normal o elevado). La pantalla
  original sólo tenía el control de PCO₂ (el de tasa metabólica no tenía botón) y así se reprodujo.

Herramientas: Imprimir datos; Imprimir gráfica en los dos primeros.
