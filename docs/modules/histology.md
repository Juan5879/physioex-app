# Ejercicio 12 — Tutorial de histología

Fuente: `PHYSIOEX/12_HistologyT` (visor CLOE con los datos en XML UTF-16). `scripts/build-histology.mjs`
convierte `xml/index.xml`, `item.xml`, `title.xml`, `description.xml`, `image.xml`, `overlay.xml` y
`overlays/*.xml` a `modules/histology/data/histology.json` y copia las 181 imágenes usadas a
`src/renderer/public/histology/`:

```bash
node scripts/build-histology.mjs D:/Proyectos/PHYSIOEX/PHYSIOEX/12_HistologyT
```

- 264 ítems con título, descripción, imagen (640×480) y capa de rótulos (líneas, círculos y etiquetas).
- Índices A-Z, por sistema, por tipo de tejido y "Histology Review", con buscador.
- En el menú principal va en su propia sección, "Material de consulta", y tiene un acceso en la barra
  superior.

Pendiente: títulos y descripciones son los originales en inglés. "Histology Review Supplement"
(`08_HistologyRS.swf`) no está en la copia del original.
