/**
 * Convierte el tutorial de histología de PhysioEx (12_HistologyT/xml, en UTF-16) a un JSON para la
 * app y copia las imágenes usadas a src/renderer/public/histology/.
 *
 *   node scripts/build-histology.mjs [carpeta 12_HistologyT]
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

const src = resolve(process.argv[2] ?? 'D:/Proyectos/PHYSIOEX/PHYSIOEX/12_HistologyT')
const outJson = resolve('src/renderer/src/modules/histology/data/histology.json')
const outImages = resolve('src/renderer/public/histology')

const read = (f) => {
  const b = readFileSync(join(src, f))
  return b[0] === 0xff && b[1] === 0xfe ? b.toString('utf16le') : b.toString('utf8')
}
const attr = (tag, name) => tag.match(new RegExp(`${name}="([^"]*)"`))?.[1]
const cdata = (s) => s.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim()

/** <tree label="001"><![CDATA[texto]]></tree> */
function textTable(file) {
  const map = {}
  for (const m of read(file).matchAll(/<tree label="([^"]+)">([\s\S]*?)<\/tree>/g)) map[m[1]] = cdata(m[2])
  return map
}
/** <tree label="001" key="valor"/> */
function attrTable(file, key) {
  const map = {}
  for (const m of read(file).matchAll(/<tree [^>]*\/>/g)) map[attr(m[0], 'label')] = attr(m[0], key)
  return map
}

const titles = textTable('xml/title.xml')
const descriptions = textTable('xml/description.xml')
const images = attrTable('xml/image.xml', 'fileName')
const overlays = attrTable('xml/overlay.xml', 'fileName')

/** capa de rótulos: líneas, círculos y etiquetas en coordenadas de la foto (640×480) */
function overlay(file) {
  if (!file || !existsSync(join(src, file))) return null
  const x = read(file)
  const n = (v) => Math.round(Number(v) * 10) / 10
  return {
    lines: [...x.matchAll(/<line [^>]*\/>/g)].map(([t]) => [n(attr(t, 'x1')), n(attr(t, 'y1')), n(attr(t, 'x2')), n(attr(t, 'y2'))]),
    circles: [...x.matchAll(/<circle [^>]*\/>/g)].map(([t]) => [n(attr(t, 'x')), n(attr(t, 'y')), n(attr(t, 'radius'))]),
    labels: [...x.matchAll(/<label ([^>]*)>([\s\S]*?)<\/label>/g)].map((m) => ({
      x: n(attr(m[1], 'x')),
      y: n(attr(m[1], 'y')),
      text: cdata(m[2])
    }))
  }
}

const items = {}
const used = new Set()
for (const m of read('xml/item.xml').matchAll(/<tree [^>]*\/>/g)) {
  const t = m[0]
  const id = attr(t, 'label')
  const imagePath = images[attr(t, 'image')]
  if (!imagePath) continue
  const file = basename(imagePath)
  used.add(file)
  items[id] = {
    title: titles[attr(t, 'title')] ?? id,
    description: descriptions[attr(t, 'description')] ?? '',
    image: file,
    overlay: overlay(overlays[attr(t, 'overlay')])
  }
}

/** índice: árbol de grupos (A-Z, sistema, tipo de tejido, repaso) con hojas que apuntan a ítems */
function parseTree(xml) {
  const root = { label: 'root', children: [] }
  const stack = [root]
  for (const m of xml.matchAll(/<tree ([^>]*?)(\/?)>|<\/tree>/g)) {
    if (m[0] === '</tree>') {
      stack.pop()
      continue
    }
    const label = attr(m[1], 'label')
    const item = attr(m[1], 'item')
    const node = item ? { label, item } : { label, children: [] }
    stack.at(-1).children.push(node)
    if (!m[2] && !item) stack.push(node)
  }
  return root.children
}
const index = parseTree(read('xml/index.xml'))

mkdirSync(outImages, { recursive: true })
mkdirSync(resolve(outJson, '..'), { recursive: true })
let missing = 0
for (const f of used) {
  const from = join(src, 'images', f)
  if (existsSync(from)) copyFileSync(from, join(outImages, f))
  else missing++
}
writeFileSync(outJson, JSON.stringify({ index, items }))
console.log(`${Object.keys(items).length} ítems, ${used.size} imágenes (${missing} faltantes) → ${outJson}`)
