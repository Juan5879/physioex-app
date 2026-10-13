// Publica el instalador ya compilado (pnpm dist) como release de GitHub con gh.
// electron-builder --publish crea el release dos veces en paralelo y falla con 422,
// por eso la subida se hace aquí.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const { version } = JSON.parse(readFileSync('package.json', 'utf8'))
const tag = `v${version}`
const outDir = join(process.env.LOCALAPPDATA ?? '', 'physioex-build')
const files = [`PhysioEx-Setup-${version}.exe`, `PhysioEx-Setup-${version}.exe.blockmap`, 'latest.yml'].map((f) =>
  join(outDir, f)
)

for (const f of files) {
  if (!existsSync(f)) throw new Error(`Falta ${f}; corre primero "pnpm dist"`)
}

const ghDefault = 'C:\\Program Files\\GitHub CLI\\gh.exe'
const gh = existsSync(ghDefault) ? ghDefault : 'gh'
const run = (args) => execFileSync(gh, args, { stdio: 'inherit' })

// El instalador no está firmado: la primera vez Windows SmartScreen muestra «Windows protegió su PC».
// Las actualizaciones automáticas no pasan por ese aviso.
const installNotes = `## Instalación

1. Descarga \`PhysioEx-Setup-${version}.exe\` y ábrelo.
2. Si aparece **«Windows protegió su PC»**, haz clic en **Más información** y luego en **Ejecutar de todas formas**.

El aviso aparece porque el instalador no tiene firma digital (un certificado cuesta dinero y este es un proyecto
académico gratuito). Solo se ve en la primera instalación: las actualizaciones posteriores se descargan e
instalan solas, sin ese aviso.`

let exists = true
try {
  execFileSync(gh, ['release', 'view', tag], { stdio: 'ignore' })
} catch {
  exists = false
}

if (exists) {
  console.log(`Actualizando archivos del release ${tag}`)
  run(['release', 'upload', tag, ...files, '--clobber'])
} else {
  console.log(`Creando release ${tag}`)
  run(['release', 'create', tag, ...files, '--title', tag, '--notes', installNotes, '--generate-notes'])
}
