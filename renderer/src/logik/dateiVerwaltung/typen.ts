export type PersonTyp = 'kunden' | 'betreuer'

export type SchemaContext = 'kunde' | 'alterBetreuer' | 'neuerBetreuer'

export type TabellenEinstellungen = {
  gruppen: Record<string, string[]>
}

export type PersonenSammlung = {
  rows: any[]
  keys: string[]
  settings: TabellenEinstellungen
}

export type PlatzhalterQuelle = {
  personType: PersonTyp
  row: any
  keys: string[]
  settings: TabellenEinstellungen
}

export type PlatzhalterUmfeld = {
  kunden?: PersonenSammlung
  betreuer?: PersonenSammlung
}

export type OrdnerTemplateRegel = {
  path: string[]
  files: string[]
}

export type OrdnerTemplateBaum = {
  id: string
  name: string
  files: string[]
  children: OrdnerTemplateBaum[]
}

export type PersonOrdnerEintrag = {
  name: string
  dir: string
  exists: boolean
  subfolders: Array<{
    name: string
    files: string[]
  }>
}

export type FehlendeDateiInfo = {
  folderName: string
  fileName: string
}

export type DateiSchemaAktion = {
  sourceContext: SchemaContext
  fromPath: string[]
  fileName: string[]
  targetContext: SchemaContext
  toPath: string[]
}

export type DateiSchema = {
  id: string
  name: string
  actions: DateiSchemaAktion[]
}

export type EmailTemplate = {
  id: string
  name: string
  to: string
  subject: string
  text: string
  selectedFiles: Array<{
    personType: PersonTyp
    folderPath: string[]
    fileTemplate: string
  }>
}

export type EmailTemplateSelection = {
  templateId: string
  selected: boolean
  kundenKeys: string[]
  betreuerKeys: string[]
}

export type DateipfadMitStatus = {
  expectedName: string
  folderPath: string[]
  found: boolean
  path?: string
}

export type DateiAnhang = {
  path: string
  filename?: string
}

export type BatchMail = {
  to: string
  subject: string
  text: string
  attachments: DateiAnhang[]
}

// Erweiterte Typen für zentrale Datei-Verwaltung
export type PersonKontext = 'kunde' | 'betreuer' | 'alterBetreuer' | 'neuerBetreuer'

export type GefundeneDatei = {
  exists: boolean
  path: string | null
  message?: string
}

export type FehlendeDatei = {
  file: string
  folderPath: string
  template: string
}

export type OrdnerStrukturMitFehlenden = PersonOrdnerEintrag & {
  fehlendeDateien?: FehlendeDatei[]
}

// Kontext-Modelle für Platzhalter-Ersetzung
export type PlatzhalterKontext = {
  personType: PersonTyp
  row: any
  settings: TabellenEinstellungen
  // Optional für kombinierte Kontexte (z.B. E-Mails)
  betreuerRow?: any
  kundeRow?: any
  betreuerSettings?: TabellenEinstellungen // Optional: Betreuer-Settings für {betreuerkunde} Platzhalter
}

// Service-Parameter-Typen
export type PersonNamenResult = {
  anzeigeName: string
  varianten: string[]
}

export type StandardOrdnerKontext = {
  baseDir: string
  personType: PersonTyp
  row: any
  settings: TabellenEinstellungen
  betreuerSettings?: TabellenEinstellungen // Optional: Betreuer-Settings für {betreuerkunde} Platzhalter
}

export type MailBatchKontext = {
  baseDir: string
  templates: EmailTemplate[]
  selections: Record<string, EmailTemplateSelection>
  kunden: any[]
  betreuer: any[]
  tableSettings: {
    kunden: TabellenEinstellungen
    betreuer: TabellenEinstellungen
  }
}

export type VerschiebungKontext = {
  baseDir: string
  schema: DateiSchema
  kunde: any
  alterBetreuer: any
  neuerBetreuer: any
  position?: 1 | 2 // Position des Betreuers (1 oder 2) für {betreuerkunde} Platzhalter
}

// API-Response-Typen (entsprechend window.api.folders)
export type EnsureStructureResponse = {
  ok?: boolean
  message?: string
  root?: string
  createdCount?: number
  createdSubCount?: number
}

export type ListForPersonsResponse = {
  ok?: boolean
  message?: string
  root?: string
  result?: PersonOrdnerEintrag[]
}

export type GetFilePathResponse = {
  ok?: boolean
  exists?: boolean
  path?: string | null
  message?: string
}

export type MoveFileResponse = {
  ok?: boolean
  message?: string
  missing?: boolean
  from?: string
  to?: string
}

export type SendBatchResponse = {
  ok?: boolean
  message?: string
}


