export {}

declare global {
  interface Window {
    api?: {
      onUpdateAvailable?: (cb: () => void) => void
      onUpdateProgress?: (cb: (p: unknown) => void) => void
      onUpdateDownloaded?: (cb: () => void) => void
      onUpdateError?: (cb: (err: unknown) => void) => void
      checkForUpdates?: () => void
      quitAndInstall?: () => void
      getConfig?: () => Promise<any>
      setConfig?: (partial: any) => Promise<any>
      chooseDirectory?: (title?: string) => Promise<string | null>
      checkLibreOffice?: () => Promise<boolean>
      installLibreOffice?: () => Promise<boolean>
    }
    docgen?: {
      getLists?: () => Promise<{ kunden: any[]; betreuer: any[] }>
      getVorlagenTree?: () => Promise<any[]>
      generateDocs?: (args: any) => Promise<{ ok: boolean; zielOrdner: string }>
      generateHtmlPdf?: (args: any) => Promise<{ ok: boolean; zielOrdner: string }>
      listInvoiceTemplates?: () => Promise<Array<{ name: string; absPath: string }>>
      generateInvoices?: (args: any) => Promise<{ ok: boolean; files: string[]; currentRechnungsnummer: number }>
    }
    db?: {
      kundenAdd?: (row: any) => Promise<boolean>
      kundenUpdate?: (payload: { __key: string; updates: any }) => Promise<boolean>
      kundenDelete?: (__key: string) => Promise<boolean>
      betreuerAdd?: (row: any) => Promise<boolean>
      betreuerUpdate?: (payload: { __key: string; updates: any }) => Promise<boolean>
      betreuerDelete?: (__key: string) => Promise<boolean>
    }
  }
}


