# Ejercicio 2 — Fisiología del músculo esquelético

Fuente: `PHYSIOEX/02_MusclePhysio/02_MusclePhysio.swf` (Flash 5, ActionScript 1, 20 fps) y
`plot_data.swf`. Decompilado con JPEXS FFDec en `extracted/02_MusclePhysio/scripts/`.

| Experimento | Frame SWF | Prefijo AS | Archivo nuevo |
| --- | --- | --- | --- |
| Estímulo único | 5 | `ss` | `experiments/SingleStimulus.tsx` |
| Estímulos múltiples | 20 | `ms` | `experiments/MultipleStimulus.tsx` |
| Contracción isométrica | 35 | `im` | `experiments/Isometric.tsx` |
| Contracción isotónica | 50 | `it` | `experiments/Isotonic.tsx` |

## Constantes (todas en `model/constants.ts`)

`K1=4.955` (4.96 en isotónica), `K2=0.045`, `K3=4.5`, `K4=1.75`, `K5=7`, `K7=0.0015`, `K8=0.05`,
umbral `thresh=1.2 V`, `Vmax=8.3 V`, voltaje seleccionable 0–10 V (pasos de 0.1),
longitud 50–100 mm (reposo `Lnom=75`), latencia `3 ms`.

## Fórmulas comunes (`model/common.ts`)

- **Fuerza pasiva**: `F_pass = floor(K4·e^(−(Lmax−L)/K5) · max(0, L−Lnom)/(Lmax−Lnom) · 100)/100`
- **Reclutamiento por voltaje**: `VRR = max(0, 1 − e^((thresh−V)/K3) · max(0, 1 − V/Vmax))`
- **Escala longitud–tensión**: `activeScale = 1 − K7·(L − Lnom)²`

## Estímulo único / isométrica (`model/twitch.ts`)

`F_act(t) = K2·K1 · c · e^(−K2·c) · VRR · activeScale`, con `c = max(0, t − latent)`, redondeado a 2 decimales.
Total = `F_act + F_pass`. El barrido avanza 2 "píxeles" por paso:

- Estímulo único: 360 px, `t_max` seleccionable (200–1000 ms), 8 pasos por frame.
- Isométrica: 180 px, `t_max = 150 ms`, 6 pasos por frame. Al terminar, agrega puntos
  (activa, pasiva, total) a la gráfica longitud–tensión.
- **Medir** (sólo estímulo único): línea vertical que avanza `t_max/360` ms por clic y muestra la
  fuerza activa/total en ese instante.

## Estímulos múltiples (`model/multipleStimulus.ts`)

Oscilador de 2º orden críticamente amortiguado excitado por impulsos:

- `ω = e^(−Δt/15)`, `κ = −e·ln ω`, `D = 2/(κω)`; `Δt = 2·t_max/360` (estímulo único) o `4·t_max/360` (tren).
- Por estímulo: `RT = 0.611·treppe·VRR`, `F_tet = activeScale·ATP·6.8`,
  `F_avail = F_tet − f − D·(f − f_old)`, `f += κω·F_avail·RT`, `treppe += 1.5·RT·(1−treppe)`,
  `ATP −= 0.015·RT·ATP`.
- Por paso: `f = 2ω·f_old − ω²·f_old_old`; filtro `F_filt` (τ = 15 ms); treppe y ATP relajan
  hacia 0.6 (τ = 1000) y 1 (τ = 200000).
- "Estímulo único" puede pulsarse varias veces durante el barrido → sumación.
- "Estímulos múltiples" inicia un tren a `1000/rate` ms (1–150 estímulos/s); el barrido da la vuelta
  hasta que se detiene y la fuerza vuelve a < 0.05 g.
- Tabla: voltaje, longitud, estímulos/s, `f_max`, pasiva, `f_max + pasiva`.

## Isotónica (`model/isotonic.ts`)

- Pesas 0.5/1/1.5/2 g. Longitud de reposo = `min(tabla[peso], altura de plataforma)` con
  tabla `{0:50, 0.5:93.4, 1:97, 1.5:99.2, 2:105}`. Plataforma 50–100 mm (inicio 75).
- 360 pasos de `t_max/360` ms (11 por frame). Si `F_act + F_pass > peso`, la tensión se fija en el peso,
  el excedente `F_lift` acorta el músculo `11·F_lift/peso` mm y acelera la relajación
  (`ΔK2 += 0.05·F_lift·Δt·K2`). Velocidad = derivada del acortamiento; se registra el máximo.
- **Unidades**: la velocidad se calcula como mm de acortamiento por ms (`Δacortamiento / Δt`, con Δt en ms),
  así que se rotula **mm/ms**. El original la rotulaba "mm/sec" por error (plot_data.swf sí decía "mm/msec").

## Herramientas

- **Graficar datos** (`plot_data.swf`): cualquier columna de la tabla contra otra; topes de eje
  2, 4, 6, 10, 20, 40, 60, 100, 150, 200, 250 (`f_setAxis`).
- **Imprimir datos / gráfica**: pide el nombre (letras, números y espacios) y genera una hoja con
  laboratorio, experimento, nombre y fecha; se puede imprimir o guardar en PDF.
- Las tablas se conservan al cambiar de experimento (como `_root.dataList` del original).
- "Registrar datos" se desactiva tras registrar un resultado, hasta el siguiente estímulo.

## Diferencias intencionales

- La tabla hace scroll en lugar de mostrar 4 filas con flechas.
- La medición usa el último trazo (el original sólo permitía medir el primero).
- Al registrar se guarda la instantánea del estímulo, aunque después se cambie voltaje o longitud
  (el original mezclaba la longitud nueva con la fuerza anterior).
- Se omitieron "Balloon help" y el control de volumen, que no cambian la simulación.
