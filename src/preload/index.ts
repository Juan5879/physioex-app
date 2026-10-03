import { contextBridge, ipcRenderer } from 'electron'

const api = {
  print: (): Promise<void> => ipcRenderer.invoke('print'),
  savePdf: (defaultName: string): Promise<boolean> => ipcRenderer.invoke('save-pdf', defaultName)
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
