import type { OrdnerTemplateRegel, OrdnerTemplateBaum, DateiSchema, EmailTemplate } from './typen'

/**
 * Service für das Laden und Speichern von Templates und Schemata aus der Config
 */

export class StandardTemplateService {

  /**
   * Lädt Ordner-Templates für einen Personentyp
   */
  static async ladeOrdnerTemplates(personType: 'kunden' | 'betreuer'): Promise<OrdnerTemplateRegel[]> {
    const cfg = await window.api?.getConfig?.()
    const templates = cfg?.folderTemplatesRules?.[personType] || []
    return Array.isArray(templates) ? templates : []
  }

  /**
   * Lädt Ordner-Templates als Baumstruktur für Editoren
   */
  static async ladeOrdnerTemplatesAlsBaum(personType: 'kunden' | 'betreuer'): Promise<OrdnerTemplateBaum[]> {
    const cfg = await window.api?.getConfig?.()

    // Neue Struktur verwenden falls vorhanden
    const paths = cfg?.folderTemplatesPaths?.[personType] || []
    const rules = cfg?.folderTemplatesRules?.[personType] || []

    // Legacy-Unterstützung
    const legacy = cfg?.folderTemplates?.[personType] || []
    const mergedPaths = Array.isArray(paths) && paths.length ? paths : (Array.isArray(legacy) ? legacy.map((name: string) => [name]) : [])

    return this.pfadeZuBaum(mergedPaths, rules)
  }

  /**
   * Speichert Ordner-Templates (sowohl Pfade als auch Regeln)
   */
  static async speichereOrdnerTemplates(
    personType: 'kunden' | 'betreuer',
    baum: OrdnerTemplateBaum[]
  ): Promise<boolean> {
    const cfg = await window.api?.getConfig?.()
    if (!cfg) return false

    const neueCfg = {
      ...cfg,
      folderTemplatesPaths: {
        ...cfg.folderTemplatesPaths,
        [personType]: this.baumZuPfade(baum)
      },
      folderTemplatesRules: {
        ...cfg.folderTemplatesRules,
        [personType]: this.baumZuRegeln(baum)
      },
      // Legacy-Feld für Abwärtskompatibilität
      folderTemplates: {
        ...cfg.folderTemplates,
        [personType]: baum.map(n => n.name)
      }
    }

    const saved = await window.api?.setConfig?.(neueCfg)
    return !!saved
  }

  /**
   * Lädt Datei-Schemata (z.B. für Betreuerwechsel)
   */
  static async ladeDateiSchemata(): Promise<DateiSchema[]> {
    const cfg = await window.api?.getConfig?.()
    const schemata = cfg?.wechselDateiSchemata || []
    return Array.isArray(schemata) ? schemata : []
  }

  /**
   * Speichert Datei-Schemata
   */
  static async speichereDateiSchemata(schemata: DateiSchema[]): Promise<boolean> {
    const cfg = await window.api?.getConfig?.()
    if (!cfg) return false

    const neueCfg = {
      ...cfg,
      wechselDateiSchemata: schemata
    }

    const saved = await window.api?.setConfig?.(neueCfg)
    return !!saved
  }

  /**
   * Lädt E-Mail-Templates
   */
  static async ladeEmailTemplates(): Promise<EmailTemplate[]> {
    const cfg = await window.api?.getConfig?.()
    const templates = cfg?.dateienMailTemplates || []
    return Array.isArray(templates) ? templates : []
  }

  /**
   * Speichert E-Mail-Templates
   */
  static async speichereEmailTemplates(templates: EmailTemplate[]): Promise<boolean> {
    const cfg = await window.api?.getConfig?.()
    if (!cfg) return false

    const neueCfg = {
      ...cfg,
      dateienMailTemplates: templates
    }

    const saved = await window.api?.setConfig?.(neueCfg)
    return !!saved
  }

  /**
   * Lädt Basis-Ordner-Pfad aus Config
   */
  static async ladeBasisOrdner(): Promise<string> {
    const cfg = await window.api?.getConfig?.()
    return cfg?.dokumenteDir || ''
  }

  /**
   * Hilfsmethoden für Baum-Konvertierung
   */
  static pfadeZuBaum(paths: (string | string[])[], rules: OrdnerTemplateRegel[]): OrdnerTemplateBaum[] {
    const root: Record<string, OrdnerTemplateBaum> = {}

    const ensureNode = (nodes: Record<string, OrdnerTemplateBaum>, segs: string[], files?: string[]) => {
      if (!segs.length) return
      const [head, ...rest] = segs
      const key = head
      if (!nodes[key]) {
        nodes[key] = {
          id: Math.random().toString(36).slice(2),
          name: head,
          files: [],
          children: []
        }
      }
      if (rest.length) {
        const childMap: Record<string, OrdnerTemplateBaum> = {}
        nodes[key].children.forEach(c => { childMap[c.name] = c })
        ensureNode(childMap, rest, files)
        nodes[key].children = Object.values(childMap)
      } else if (files && files.length) {
        nodes[key].files = Array.from(new Set([...(nodes[key].files || []), ...files]))
      }
    }

    // Pfade hinzufügen
    for (const p of paths) {
      const segs = Array.isArray(p) ? p : String(p).split(/[\\/]+/).map(s => s.trim()).filter(Boolean)
      if (!segs.length) continue
      ensureNode(root, segs)
    }

    // Regeln hinzufügen
    if (rules && rules.length) {
      for (const r of rules) {
        const segs = (r.path || []).filter(Boolean)
        ensureNode(root, segs, (r.files || []).filter(Boolean))
      }
    }

    return Object.values(root)
  }

  static baumZuPfade(nodes: OrdnerTemplateBaum[]): string[][] {
    const out: string[][] = []
    const walk = (n: OrdnerTemplateBaum, acc: string[]) => {
      const next = [...acc, n.name]
      out.push(next)
      n.children.forEach(c => walk(c, next))
    }
    nodes.forEach(n => walk(n, []))
    return out
  }

  private static baumZuRegeln(nodes: OrdnerTemplateBaum[]): OrdnerTemplateRegel[] {
    const out: OrdnerTemplateRegel[] = []
    const walk = (n: OrdnerTemplateBaum, acc: string[]) => {
      const next = [...acc, n.name]
      if (n.files && n.files.length) {
        out.push({ path: next, files: n.files.filter(Boolean) })
      }
      n.children.forEach(c => walk(c, next))
    }
    nodes.forEach(n => walk(n, []))
    return out
  }
}
