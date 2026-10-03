/** Imprime la ventana actual usando el proceso principal de Electron o, si no existe, window.print */
export async function printWindow(): Promise<void> {
  // dejar que React pinte el contenido de impresión antes de abrir el diálogo
  await new Promise((r) => setTimeout(r, 50))
  if (window.api) await window.api.print()
  else window.print()
}

export async function savePdf(defaultName: string): Promise<boolean> {
  await new Promise((r) => setTimeout(r, 50))
  if (window.api) return window.api.savePdf(defaultName)
  window.print()
  return false
}
