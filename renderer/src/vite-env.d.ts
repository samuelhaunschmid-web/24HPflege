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
      installLibreOffice?: () => Promise<{ ok: boolean; brewPath?: string | null; message?: string; uninstall?: { code?: number; stdout?: string; stderr?: string }; install?: { code?: number; stdout?: string; stderr?: string }; chocolatey?: { ok?: boolean; installed?: boolean; stdout?: string; stderr?: string } }>
      checkHomebrew?: () => Promise<boolean>
      installHomebrew?: () => Promise<{ ok: boolean; alreadyInstalled?: boolean; code?: number; stdout?: string; stderr?: string; message?: string }>
      getPlatform?: () => Promise<string>
      checkChocolatey?: () => Promise<boolean>
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
      kundenRestore?: (__key: string) => Promise<boolean>
      archivKundenList?: () => Promise<any[]>
      archivKundenDelete?: (__key: string) => Promise<boolean>
      betreuerAdd?: (row: any) => Promise<boolean>
      betreuerUpdate?: (payload: { __key: string; updates: any }) => Promise<boolean>
      betreuerDelete?: (__key: string) => Promise<boolean>
      betreuerRestore?: (__key: string) => Promise<boolean>
      archivBetreuerList?: () => Promise<any[]>
      archivBetreuerDelete?: (__key: string) => Promise<boolean>
      archivDebug?: () => Promise<{ altDir: string; kundenPath: string; betreuerPath: string; altDirExists: boolean; kundenExists: boolean; betreuerExists: boolean }>
    }
  }
}


