# Ejercicio 7 — Mecánica del sistema respiratorio

Fuente: `PHYSIOEX/06_Respiratory/06_Respiratory.swf`. Los motores están en el `onClipEvent(enterFrame)` de
cada pantalla (frames 5, 15 y 25). Modelo en `model/respiratory.ts`.

| Experimento | Frame | Archivo |
| --- | --- | --- |
| Volúmenes respiratorios | 5 | `experiments/Volumes.tsx` |
| Factores que afectan la respiración | 15 | `experiments/Factors.tsx` |
| Variaciones en la respiración | 25 | `experiments/Breathing.tsx` |

## Modelo

- Presión de la campana sinusoidal; flujo por frame `−0.168·r⁴·ΔP` (volúmenes) o `−0.15·r⁴·ΔP·surfactante/5`
  (factores). El volumen pulmonar integra el flujo; la pantalla es litros (0–6) contra 60 s.
- **Volúmenes**: 15 respiraciones/min, 15 frames por respiración. ERV y FVC esperan al inicio de la
  respiración y amplifican la presión (×3.4; ×7.19, 9.59, 4.05 y 1.65). Se calculan VC, VRE, VRI, VR, CV,
  CPT y VEF₁ (escalado con un tubo 0.1 mm más ancho, como el original).
- **Factores**: radio 3–5 mm, frecuencia 5–25. El surfactante sube de 5 a 10. Abrir una válvula colapsa
  ese pulmón (neumotórax): su flujo y su presión pasan a 0 y el trazo cae de a 80 ml por frame.
- **Variaciones**: respiración rápida, reinhalación y apnea llevan la PCO₂ hacia 32, 55 y 70 mm Hg
  (con el ruido del original, cuyo `Math.random(n)` ignoraba el argumento). Se registran PCO₂ media,
  máxima y mínima, frecuencia y flujo.

Herramientas: Imprimir datos e Imprimir gráfica.
