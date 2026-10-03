/** Estado de las actualizaciones automáticas que el proceso principal envía a la interfaz */
export interface UpdateStatus {
  state: 'checking' | 'downloading' | 'ready' | 'none' | 'error'
  version?: string
  percent?: number
}
