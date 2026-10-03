import { app, type BrowserWindow } from 'electron'
import electronUpdater from 'electron-updater'
import type { UpdateStatus } from './updateStatus'

// electron-updater es CommonJS; desde ESM se importa el default
const { autoUpdater } = electronUpdater

/**
 * Actualizaciones automáticas desde los releases de GitHub:
 * 1. al iniciar consulta el último release publicado,
 * 2. si hay una versión nueva la descarga en segundo plano,
 * 3. queda en reposo y se instala en silencio al cerrar el programa,
 *    así que la siguiente vez que se abre ya está actualizado.
 */
export function initAutoUpdates(win: BrowserWindow): void {
  // en desarrollo no hay app-update.yml ni instalador que reemplazar
  if (!app.isPackaged) return

  let latest: UpdateStatus = { state: 'checking' }
  const send = (status: UpdateStatus): void => {
    latest = status
    if (!win.isDestroyed()) win.webContents.send('update-status', status)
  }
  // si la ventana se recarga, reenviar el último estado
  win.webContents.on('did-finish-load', () => send(latest))

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.logger = console

  autoUpdater.on('checking-for-update', () => send({ state: 'checking' }))
  autoUpdater.on('update-not-available', () => send({ state: 'none' }))
  autoUpdater.on('update-available', (info) => send({ state: 'downloading', version: info.version, percent: 0 }))
  autoUpdater.on('download-progress', (p) =>
    send({ state: 'downloading', version: latest.version, percent: Math.round(p.percent) })
  )
  autoUpdater.on('update-downloaded', (info) => send({ state: 'ready', version: info.version }))
  autoUpdater.on('error', (err) => {
    // sin internet o sin releases: la app sigue funcionando normalmente
    console.error('[updater]', err)
    send({ state: 'error' })
  })

  autoUpdater.checkForUpdates().catch((err) => console.error('[updater]', err))
}
