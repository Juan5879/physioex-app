// Genera build/icon.ico y build/icon.png (ícono del .exe, la barra de tareas y el instalador)
// a partir de los SVG de logo/. Se corre con Electron para rasterizar el SVG:
//
//   npx electron scripts/build-icon.cjs
//
// Hasta 32 px usa la versión simple del isotipo (se lee mejor); desde 48 px, la que tiene grilla.
const { app, BrowserWindow } = require('electron')
const { mkdirSync, readFileSync, writeFileSync } = require('node:fs')
const { join } = require('node:path')

const root = join(__dirname, '..')
const SIZES = [16, 24, 32, 48, 64, 128, 256]
const svg = (name) => readFileSync(join(root, 'logo', name), 'utf8')
const small = svg('physioex-trazo-pequeno.svg')
const large = svg('physioex-trazo.svg')

const RENDER = 512

/** Rasteriza el SVG a 512 px y lo achica al tamaño pedido */
async function render(win, source, size) {
  const html = `<html><body style="margin:0;background:transparent">${source.replace(
    '<svg ',
    `<svg width="${RENDER}" height="${RENDER}" `
  )}</body></html>`
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
  await new Promise((r) => setTimeout(r, 300))
  const img = await win.webContents.capturePage({ x: 0, y: 0, width: RENDER, height: RENDER })
  return size === RENDER ? img.toPNG() : img.resize({ width: size, height: size, quality: 'best' }).toPNG()
}

/** ICO con las imágenes PNG embebidas (formato válido desde Windows Vista) */
function ico(pngs) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(pngs.length, 4)
  const entries = []
  let offset = 6 + 16 * pngs.length
  for (const { size, data } of pngs) {
    const e = Buffer.alloc(16)
    e.writeUInt8(size >= 256 ? 0 : size, 0)
    e.writeUInt8(size >= 256 ? 0 : size, 1)
    e.writeUInt8(0, 2)
    e.writeUInt8(0, 3)
    e.writeUInt16LE(1, 4)
    e.writeUInt16LE(32, 6)
    e.writeUInt32LE(data.length, 8)
    e.writeUInt32LE(offset, 12)
    offset += data.length
    entries.push(e)
  }
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)])
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: RENDER,
    height: RENDER,
    useContentSize: true,
    show: false,
    transparent: true,
    frame: false,
    backgroundColor: '#00000000'
  })
  const pngs = []
  for (const size of SIZES) pngs.push({ size, data: await render(win, size <= 32 ? small : large, size) })
  const out = join(root, 'build')
  mkdirSync(out, { recursive: true })
  writeFileSync(join(out, 'icon.ico'), ico(pngs))
  writeFileSync(join(out, 'icon.png'), await render(win, large, 512))
  console.log('build/icon.ico y build/icon.png generados')
  app.quit()
})
