import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { UpdateStatus } from '../main/updateStatus'

const api = {
  print: (): Promise<void> => ipcRenderer.invoke('print'),
  savePdf: (defaultName: string): Promise<boolean> => ipcRenderer.invoke('save-pdf', defaultName),
  /** Suscribe al estado de las actualizaciones automáticas; devuelve la función para desuscribir */
  onUpdateStatus: (cb: (status: UpdateStatus) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, status: UpdateStatus): void => cb(status)
    ipcRenderer.on('update-status', listener)
    return () => ipcRenderer.removeListener('update-status', listener)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
export type { UpdateStatus }
