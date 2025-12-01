import type { PlatzhalterKontext } from './typen'

/**
 * Zentrale Platzhalter-Ersetzungslogik für Datei-Verwaltung
 * Unterstützt alle Platzhalter: {vorname}, {nachname}, {kvname}, {kfname}, {bvname}, {bfname}, {nb1}, {nb2}, {nk1}, {betreuerkunde}, {dateityp}
 */
export function ersetzePlatzhalter(text: string, kontext: PlatzhalterKontext): string {
  const { personType, row, settings, kundeRow, betreuerRow } = kontext

  // Grunddaten der Hauptperson extrahieren
  const vorKey = settings.gruppen ? Object.keys(settings.gruppen).find(k => (settings.gruppen[k] || []).includes('vorname')) : undefined
  const nachKey = settings.gruppen ? Object.keys(settings.gruppen).find(k => (settings.gruppen[k] || []).includes('nachname')) : undefined

  const vor = String(vorKey && row ? row[vorKey] || '' : '').trim()
  const nach = String(nachKey && row ? row[nachKey] || '' : '').trim()

  // Spezielle Platzhalter für Betreuer eines Kunden
  let nb1 = ''
  let nb2 = ''
  let nk1 = ''
  let betreuerkunde = '' // Neuer Platzhalter

  if (personType === 'kunden') {
    // Betreuer-Platzhalter für Kunden (nb1 / nb2) – rein aus der Kundenzeile
    const b1Key = Object.keys(settings.gruppen).find(k => (settings.gruppen[k] || []).includes('betreuer1'))
    const b2Key = Object.keys(settings.gruppen).find(k => (settings.gruppen[k] || []).includes('betreuer2'))

    const b1Full = b1Key ? String(row?.[b1Key] || '').trim() : ''
    const b2Full = b2Key ? String(row?.[b2Key] || '').trim() : ''

    const getNachname = (full: string) => {
      const parts = full.split(/\s+/).filter(Boolean)
      return parts.length > 0 ? parts[parts.length - 1] : ''
    }

    nb1 = getNachname(b1Full)
    nb2 = getNachname(b2Full)
    
    // {betreuerkunde}: Verwendet den Nachnamen des ausgewählten Betreuers
    // Wenn betreuerRow vorhanden ist (z.B. bei Mail-Versand), verwende diesen
    // Sonst verwende Betreuer 1, falls vorhanden, sonst Betreuer 2
    if (betreuerRow) {
      // Verwende Betreuer-Settings, wenn vorhanden, sonst Kunden-Settings
      // Betreuer-Settings werden benötigt, um den Nachnamen-Key korrekt zu finden
      const verwendeteSettings = kontext.betreuerSettings || settings
      const betreuerNachKey = Object.keys(verwendeteSettings.gruppen || {}).find(k => (verwendeteSettings.gruppen[k] || []).includes('nachname'))
      
      // Debug-Log
      console.log('[PLATZHALTER] {betreuerkunde} Ersetzung:', {
        hatBetreuerSettings: !!kontext.betreuerSettings,
        verwendeteSettingsKeys: Object.keys(verwendeteSettings.gruppen || {}),
        betreuerNachKey,
        betreuerRowKeys: Object.keys(betreuerRow || {}),
        betreuerRowValues: Object.entries(betreuerRow || {}).map(([k, v]) => `${k}: ${v}`).join(', ')
      })
      
      if (betreuerNachKey) {
        betreuerkunde = String(betreuerRow[betreuerNachKey] || '').trim()
      } else {
        // Fallback: Versuche direkt aus __display oder anderen Feldern
        const display = String(betreuerRow.__display || '').trim()
        if (display) {
          const parts = display.split(/\s+/).filter(Boolean)
          betreuerkunde = parts.length > 0 ? parts[parts.length - 1] : ''
        }
      }
      
      console.log('[PLATZHALTER] {betreuerkunde} Ergebnis:', betreuerkunde)
    } else {
      // Fallback: Verwende Betreuer 1, falls vorhanden, sonst Betreuer 2
      betreuerkunde = nb1 || nb2
    }
  }

  if (personType === 'betreuer' && betreuerRow && kundeRow) {
    // Kunde-Platzhalter für Betreuer (erster zugewiesener Kunde)
    const kundenNachKey = Object.keys(settings.gruppen).find(k => (settings.gruppen[k] || []).includes('nachname'))
    const betreuerFull = `${vor} ${nach}`.trim()

    // Finde ersten Kunden, der diesen Betreuer hat
    if (kundeRow) {
      const kundenB1Key = Object.keys(settings.gruppen).find(k => (settings.gruppen[k] || []).includes('betreuer1'))
      const kundenB2Key = Object.keys(settings.gruppen).find(k => (settings.gruppen[k] || []).includes('betreuer2'))

      const b1Val = kundenB1Key ? String(kundeRow[kundenB1Key] || '').trim() : ''
      const b2Val = kundenB2Key ? String(kundeRow[kundenB2Key] || '').trim() : ''

      if (b1Val === betreuerFull || b2Val === betreuerFull) {
        nk1 = kundenNachKey ? String(kundeRow[kundenNachKey] || '').trim() : ''
      }
    }
  }
  
  // Für Betreuer: {betreuerkunde} ist der eigene Nachname
  if (personType === 'betreuer') {
    betreuerkunde = nach
  }

  // Ersetzung durchführen
  let result = String(text || '')

  // Grund-Platzhalter (funktionieren für beide Personentypen)
  result = result.replace(/\{vorname\}/gi, vor)
  result = result.replace(/\{nachname\}/gi, nach)

  // Kunden-spezifische Platzhalter
  result = result.replace(/\{kvname\}/gi, personType === 'kunden' ? vor : '')
  result = result.replace(/\{kfname\}/gi, personType === 'kunden' ? nach : '')

  // Betreuer-spezifische Platzhalter
  result = result.replace(/\{bvname\}/gi, personType === 'betreuer' ? vor : '')
  result = result.replace(/\{bfname\}/gi, personType === 'betreuer' ? nach : '')

  // Betreuer-Nachnamen für Kunden
  result = result.replace(/\{nb1\}/gi, nb1)
  result = result.replace(/\{nb2\}/gi, nb2)

  // Kunden-Nachname für Betreuer
  result = result.replace(/\{nk1\}/gi, nk1)
  
  // Neuer Platzhalter: {betreuerkunde}
  result = result.replace(/\{betreuerkunde\}/gi, betreuerkunde)
  
  // Neuer Platzhalter: {dateityp} - wird zu leerem String ersetzt (für Wildcard-Suche)
  result = result.replace(/\{dateityp\}/gi, '')

  return result
}

/**
 * Hilfsfunktion: Ermittelt Vor- und Nachnamen aus einer Personen-Zeile
 */
export function extrahiereNamen(row: any, settings: any): { vorname: string; nachname: string } {
  const vorKey = Object.keys(settings.gruppen).find(k => (settings.gruppen[k] || []).includes('vorname'))
  const nachKey = Object.keys(settings.gruppen).find(k => (settings.gruppen[k] || []).includes('nachname'))

  return {
    vorname: String(vorKey ? row[vorKey] || '' : '').trim(),
    nachname: String(nachKey ? row[nachKey] || '' : '').trim()
  }
}

/**
 * Hilfsfunktion: Erstellt beide Namensvarianten (Nachname Vorname / Vorname Nachname)
 * Primäre Variante ist Nachname Vorname für Ordner-Namen
 */
export function erstelleNamensVarianten(vorname: string, nachname: string): string[] {
  const variant1 = `${nachname} ${vorname}`.trim() // Primäre Variante: Nachname Vorname
  const variant2 = `${vorname} ${nachname}`.trim() // Alternative Variante: Vorname Nachname
  return [variant1, variant2].filter(Boolean)
}

/**
 * Hilfsfunktion: Sanitisiert Dateinamen für das Dateisystem
 */
export function sanitisiereDateiname(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '-')
}
