# Ejercicio 4 — Fisiología del sistema endocrino

Fuente: `PHYSIOEX/10_EndoPhysio/10_EndoPhysio.swf` (Flash, ActionScript 1, 20 fps). Decompilado con JPEXS FFDec
en `extracted/10_EndoPhysio/scripts/`. Casi toda la lógica está repartida en los `onClipEvent` de los
botones y objetos de cada frame.

| Experimento | Frame SWF | Prefijo AS | Archivo nuevo |
| --- | --- | --- | --- |
| Metabolismo | 5 | `m` | `experiments/Metabolism.tsx` |
| Terapia de reemplazo hormonal | 15 | `hrt` | `experiments/HormoneReplacement.tsx` |
| Insulina y diabetes, parte 1 | 25 | `id` | `experiments/InsulinStandard.tsx` |
| Insulina y diabetes, parte 2 | 35 / 40 | `id2` | `experiments/InsulinDiabetes.tsx` |

## Metabolismo (`model/endocrine.ts`)

- Ratas: normal, tiroidectomizada (Tx) e hipofisectomizada (Hypox). Peso: 249 + random(20)/10 g la normal,
  244 + random(20)/10 las operadas.
- Consumo de O₂ (ml/s) según la hormona inyectada:

  | Hormona | Normal | Tx | Hypox |
  | --- | --- | --- | --- |
  | — | 0.11833 | 0.105 | 0.105 |
  | Tiroxina | 0.12667 | 0.11833 | 0.11833 |
  | TSH | 0.12667 | 0.105 | 0.11833 |
  | Propiltiouracilo | 0.105 | 0.105 | 0.105 |

  `O₂ = round(tasa · t, 1)`; en 1 minuto: 7.1 ml la normal, 6.3 las operadas.
- Temporizador 0–10 min; el reloj avanza 0.2 s por frame. Sólo se consume O₂ con la pinza cerrada; si la
  pinza y el conector en T quedan abiertos, la cámara se ventila y el consumo vuelve a cero.
- Al terminar hay que cambiar el conector en T (manómetro–jeringa) e inyectar O₂ (0–20 ml, pasos de 0.1)
  hasta igualar el manómetro. Se registra el **volumen que inyectó el alumno**, como en el original.
- Una sola rata puede recibir hormona; hay que limpiarla antes de inyectar otra.

## Reemplazo hormonal

- Dos ratas (control y experimental), una inyección de salina o estrógeno por rata por día, hasta 15 días.
  Después de cada inyección hay que limpiar la jeringa para volver a llenarla.
- Peso del útero según las inyecciones de estrógeno (`a_uteweight`): 0.10, 0.19, 0.26, 0.34, … 1.30 g.
  La balanza agrega dos dígitos al azar (`"0.42" + "3" + "7"` → 0.4237 g). Hay que poner el papel (0.91xx g),
  tarar y después el útero.

## Insulina y diabetes

- **Parte 1**: el tubo *i* recibe *i* gotas de glucosa estándar y 5 − *i* de agua; mezclar, centrifugar,
  quitar el sedimento, 5 gotas de reactivo de color, incubar y medir en orden. Densidad óptica 0.3, 0.5,
  0.6, 0.8, 1.0 para 30, 60, 90, 120 y 150 mg/dl. "Graficar" dibuja la recta (mínimos cuadrados).
- **Parte 2**: la rata control recibe salina y la experimental aloxano; se toma sangre (tubos 1 y 2), se
  inyecta insulina y se vuelve a tomar sangre (tubos 3 y 4). Reactivos: agua (5), hidróxido de bario (5),
  heparina (1), luego el mismo procesamiento. Densidad óptica 0.62, 0.87, 0.62, 0.68. La glucosa **la lee el
  alumno** moviendo la línea sobre la curva patrón (en el original, glucosa = x/2); los valores esperados son
  87, 135, 87 y 93 mg/dl. Cada visita al experimento abre una corrida nueva.

## Herramientas

El original sólo tenía **Imprimir datos**.

## Diferencias intencionales

- Los arrastres (ratas, jeringas, goteros, tubos, útero) se hacen con clic: se elige la jeringa o el gotero
  y después la rata o el tubo.
- En la parte 2 "Extraer sangre" toma la muestra y la deja en su tubo en un solo paso.
- La lectura de glucosa se puede escribir además de mover la línea.
- Los tiempos se muestran como m:ss (el original usaba m.ss).
