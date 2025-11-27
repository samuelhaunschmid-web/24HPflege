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
      saveFile?: (title?: string, defaultPath?: string, filters?: Array<{ name: string; extensions: string[] }>) => Promise<string | null>
      writeTextFile?: (filePath: string, content: string) => Promise<{ ok?: boolean }>
      folders?: {
        ensureStructure?: (payload: { baseDir: string; personType: 'kunden' | 'betreuer'; names: string[]; subfolders: (string | string[])[] }) => Promise<{ ok?: boolean; message?: string; root?: string; createdCount?: number; createdSubCount?: number }>
        listForPersons?: (payload: { baseDir: string; personType: 'kunden' | 'betreuer'; names: string[] }) => Promise<{ ok?: boolean; message?: string; root?: string; result?: Array<{ name: string; dir: string; exists: boolean; subfolders: Array<{ name: string; files: string[] }> }> }>
        getFilePath?: (payload: { baseDir: string; personType: 'kunden' | 'betreuer'; personName: string; folderPath: string[]; fileName: string }) => Promise<{ ok?: boolean; exists?: boolean; path?: string | null; message?: string }>
        moveFile?: (payload: { baseDir: string; fromPersonType: 'kunden' | 'betreuer'; fromPersonName: string; fromPath: string[]; fileName: string; toPersonType: 'kunden' | 'betreuer'; toPersonName: string; toPath: string[] }) => Promise<{ ok?: boolean; message?: string; missing?: boolean; from?: string; to?: string }>
      }
      openFolderDialog?: (personType: 'kunden' | 'betreuer') => Promise<{ ok?: boolean; message?: string }>
      openMailTemplatesDialog?: () => Promise<{ ok?: boolean; message?: string }>
      checkLibreOffice?: () => Promise<boolean>
      installLibreOffice?: () => Promise<{ ok: boolean; brewPath?: string | null; message?: string; uninstall?: { code?: number; stdout?: string; stderr?: string }; install?: { code?: number; stdout?: string; stderr?: string }; chocolatey?: { ok?: boolean; installed?: boolean; stdout?: string; stderr?: string } }>
      checkHomebrew?: () => Promise<boolean>
      installHomebrew?: () => Promise<{ ok: boolean; alreadyInstalled?: boolean; code?: number; stdout?: string; stderr?: string; message?: string }>
      getPlatform?: () => Promise<string>
      checkChocolatey?: () => Promise<boolean>
      mail?: {
        googleStartAuth?: () => Promise<{ ok?: boolean; message?: string }>
        googleStoreTokens?: (tokens: { access_token?: string; refresh_token?: string; expiry_date?: number; scope?: string; token_type?: string }) => Promise<{ ok?: boolean; message?: string }>
        googleDisconnect?: () => Promise<{ ok?: boolean; message?: string }>
        send?: (payload: { to: string; subject: string; text?: string; html?: string; attachments?: Array<{ path: string; filename?: string }>; fromName?: string; fromAddress?: string }) => Promise<{ ok?: boolean; message?: string }>
        sendBatch?: (list: Array<{ to: string; subject: string; text?: string; html?: string; attachments?: Array<{ path: string; filename?: string }>; fromName?: string; fromAddress?: string }>) => Promise<{ ok?: boolean; message?: string }>
      }
    }
    docgen?: {
      getLists?: () => Promise<{ kunden: any[]; betreuer: any[] }>
      getVorlagenTree?: () => Promise<any[]>
      generateDocs?: (args: any) => Promise<{ ok: boolean; zielOrdner: string }>
      generateHtmlPdf?: (args: any) => Promise<{ ok: boolean; zielOrdner: string }>
      listInvoiceTemplates?: () => Promise<Array<{ name: string; absPath: string }>>
      generateInvoices?: (args: any) => Promise<{ ok: boolean; files: string[]; currentRechnungsnummer: number; byKey?: Record<string, string[]>; invoiceData?: Record<string, Array<{ rechnungsnummer: number; nachname: string; gesamtsumme: string; datum: string }>> }>
      getVorlagenGruppen?: () => Promise<{ groups: Record<string, string[]>; order: string[] }>
      createVorlagenGruppe?: (name: string) => Promise<boolean>
      renameVorlagenGruppe?: (oldName: string, newName: string) => Promise<boolean>
      deleteVorlagenGruppe?: (name: string) => Promise<boolean>
      updateVorlagenGruppeTemplates?: (groupName: string, templates: string[]) => Promise<boolean>
      updateVorlagenGruppenOrder?: (order: string[]) => Promise<boolean>
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


