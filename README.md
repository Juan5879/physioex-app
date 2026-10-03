# PhysioEx (reconstrucción)

Reconstrucción de las simulaciones de laboratorio PhysioEx 6.0 (originalmente en Flash) como app de
escritorio con **Electron + React + Tailwind + TypeScript**, en español e inglés.

## Comandos

```bash
pnpm install     # dependencias
pnpm dev         # app en modo desarrollo (recarga en caliente)
pnpm test        # pruebas del modelo fisiológico
pnpm typecheck   # verificación de tipos
pnpm build       # compila a out/
pnpm dist        # instalador de Windows en dist/
```

## Estructura

```
src/main/          proceso principal de Electron (ventana, imprimir, guardar PDF)
src/preload/       puente seguro window.api
src/renderer/src/
  app/             shell: menú principal, barra superior, rutas
  shared/
    components/    Oscilloscope, DataTable, Stepper, PlotData, PrintReport, ExperimentTools, ui
    lib/           formato, bucle a 20 fps, animación de barrido, fábrica de stores
    i18n/          textos comunes es/en
  modules/
    registry.ts    lista de los 13 laboratorios
    muscle/        Ejercicio 2 (migrado)
      model/       lógica fisiológica pura (sin React) + pruebas
      experiments/ una vista por experimento
      components/  aparato, columnas de tablas, layout
      i18n/        textos del módulo es/en
      store.ts     estado por experimento
docs/modules/      especificación de cada laboratorio extraída del SWF
extracted/         salida del decompilador (ignorada por git)
```

## Cómo migrar otro laboratorio

1. **Decompilar** el SWF con JPEXS FFDec (en `%LOCALAPPDATA%\physioex-tools`):
   ```bash
   java -Djava.awt.headless=true -jar ffdec.jar -export script,text,frame extracted/<modulo> PHYSIOEX/<carpeta>/<archivo>.swf
   ```
   Los scripts de cada experimento suelen estar en `scripts/frame_N/DoAction.as` (constantes y funciones)
   y en `PlaceObject2_*/onClipEvent(enterFrame).as` (botones y bucles de cálculo). `frames/*.png`
   muestra cada pantalla y `texts/` los textos de la interfaz.
2. **Documentar** en `docs/modules/<id>.md`: constantes, fórmulas, controles y rangos, columnas de tabla.
3. **Modelo** en `modules/<id>/model/`: funciones puras portadas literalmente del AS, con pruebas
   en `*.test.ts`.
4. **Vistas**: un componente por experimento usando los componentes de `shared/` y
   `createExperimentStore` para parámetros, tabla y trazos.
5. **Registrar** en `modules/registry.ts`: `component: lazy(() => import('./<id>'))` y sus traducciones.
