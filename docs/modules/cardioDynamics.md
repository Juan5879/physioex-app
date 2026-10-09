# Ejercicio 5 — Dinámica cardiovascular

Fuente: `PHYSIOEX/03_CardioDynam/03_CardioDynam.swf` (Flash, ActionScript 1, 20 fps) y `plot_data.swf`.
Decompilado con JPEXS FFDec en `extracted/03_CardioDynam/scripts/`.

| Experimento | Frame SWF | Prefijo AS | Archivo nuevo |
| --- | --- | --- | --- |
| Resistencia vascular | 5 | `vr` | `experiments/VesselResistance.tsx` |
| Mecánica de la bomba | 15 | `pm` | `experiments/PumpMechanics.tsx` |

## Resistencia vascular (`model/cardio.ts`)

- Controles: presión 0–225 mm Hg (100), radio 1–6 mm (3.0, pasos de 0.1), viscosidad 0.1–10 (3.5),
  longitud 10–50 mm (50, pasos de 5).
- **Ley de Poiseuille** (`f_doVRFlowCalc`): `flujo = 3.14 · r⁴ · P / (8 · L · η)` ml/min, redondeado a 1 decimal.
  Sin presión → aviso de presión insuficiente; flujo < 0.1 → aviso de flujo bajo.
- La animación llena el tubo, pasa el vaso izquierdo al derecho a `flujo/13.5` px por frame y vacía el tubo.
  Después de una corrida hay que **Rellenar** antes de volver a iniciar.
- Tabla: flujo, radio, viscosidad, longitud, presión. Conjuntos iniciales: Radio, Viscosidad, Longitud,
  Presión; se pueden agregar y borrar conjuntos con nombre.

## Mecánica de la bomba

- Controles: presión del vaso izquierdo 0–225 (40), de la bomba 0–225 (120), del vaso derecho 0–225 (80),
  golpes 5–20 (10), radios izquierdo y derecho 1–6 (3.0), volumen de inicio (fin–120, 120) y de fin
  (0–inicio, 50). Volumen sistólico = inicio − fin.
- `flujo_izq = r_izq⁴ · P_izq · 3.14`, `flujo_der = r_der⁴ · (P_bomba − P_der) · 3.14`,
  `frecuencia = flujo_izq · flujo_der / (VS · (flujo_izq + flujo_der))` golpes/min, `flujo = frecuencia · VS`.
- Avisos: líquido insuficiente (`5000 ml < golpes · VS`), sin presión de llenado, presión de la bomba no mayor
  que la del vaso derecho, frecuencia > 999.
- El émbolo baja a `flujo_der/375` px por frame (vaciado) y sube a `flujo_izq/375` (llenado). "Un golpe" no
  muestra resultados; "Bombeo automático" sí y habilita el registro.
- Tabla: flujo, radio izq., radio der., VS, frecuencia, presión izq., diferencia de presión der. Conjuntos
  iniciales: Rad. der. y Vol. golpe.

## Herramientas

**Graficar datos** (cualquier columna contra otra del conjunto seleccionado) e **Imprimir datos** (una tabla
por conjunto).

## Diferencias intencionales

- Las animaciones duran a lo sumo 10 s (resistencia) y 20 s (bomba); con flujos muy bajos el original podía
  tardar minutos.
