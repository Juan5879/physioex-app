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
  run(['release', 'create', tag, ...files, '--title', tag, '--generate-notes'])
}
