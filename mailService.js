const fs = require('fs')
const path = require('path')

function getLogPath(app) {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'mail-log.json')
}

function appendLog(app, entry) {
  try {
    const p = getLogPath(app)
    let arr = []
    if (fs.existsSync(p)) {
      try { arr = JSON.parse(fs.readFileSync(p, 'utf-8')) || [] } catch {}
    }
    arr.push({ time: new Date().toISOString(), ...entry })
    fs.writeFileSync(p, JSON.stringify(arr, null, 2))
  } catch {}
}

function haveNodemailer() {
  try { require.resolve('nodemailer'); return true } catch { return false }
}

async function sendMailWithOAuth2(app, cfg, payload) {
  if (!haveNodemailer()) {
    const message = 'nodemailer nicht installiert'
    appendLog(app, { ok: false, error: message, payload: { to: payload?.to, subject: payload?.subject } })
    return { ok: false, message }
  }
  const nodemailer = require('nodemailer')
  const tokens = cfg.googleOAuthTokens
  const clientId = cfg.googleClientId
  const clientSecret = cfg.googleClientSecret
  const refreshToken = tokens?.refresh_token || cfg.googleRefreshToken
  const accessToken = tokens?.access_token
  if (!clientId || !clientSecret || !refreshToken) {
    const message = 'Google OAuth2 nicht vollständig konfiguriert'
    appendLog(app, { ok: false, error: message, payload: { to: payload?.to, subject: payload?.subject } })
    return { ok: false, message }
  }

  const fromName = payload?.fromName || cfg.fromName || ''
  const fromAddress = payload?.fromAddress || cfg.fromAddress
  if (!fromAddress) {
    const message = 'Absender-Adresse fehlt'
    appendLog(app, { ok: false, error: message })
    return { ok: false, message }
  }

  // Hinweis: accessToken-Erneuerung via googleapis wäre ideal; hier verwenden wir vorhandenes Token, sofern gesetzt
  // nodemailer XOAUTH2
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: fromAddress,
      clientId,
      clientSecret,
      refreshToken,
      accessToken: accessToken || undefined,
    },
  })

  // Normalisiere Attachment-Namen: nie absolute Pfade im Dateinamen
  // Validiere und filtere Anhänge: nur solche mit gültigem Pfad und existierender Datei
  let attachments = undefined
  if (Array.isArray(payload?.attachments) && payload.attachments.length > 0) {
    attachments = payload.attachments.filter(att => {
      if (!att || !att.path) return false
      try {
        // Pfad kann absolut oder relativ sein - beide sollten funktionieren
        const fullPath = path.isAbsolute(att.path) ? att.path : path.resolve(att.path)
        const exists = fs.existsSync(fullPath)
        if (!exists) {
          appendLog(app, { ok: false, error: `Anhang-Datei nicht gefunden: ${att.path}`, payload: { to: payload?.to, subject: payload?.subject } })
          return false
        }
        const isFile = fs.statSync(fullPath).isFile()
        if (!isFile) {
          appendLog(app, { ok: false, error: `Anhang ist keine Datei: ${att.path}`, payload: { to: payload?.to, subject: payload?.subject } })
          return false
        }
        return true
      } catch (err) {
        appendLog(app, { ok: false, error: `Fehler beim Prüfen des Anhangs: ${att.path} - ${String(err)}`, payload: { to: payload?.to, subject: payload?.subject } })
        return false
      }
    }).map(att => {
      try {
        const filename = att?.filename || path.basename(att?.path || '') || 'Anhang';
        // Verwende den originalen Pfad (kann absolut oder relativ sein)
        return { path: att.path, filename };
      } catch (err) { 
        return { path: att?.path, filename: 'Anhang' }
      }
    })
    // Wenn nach Filterung keine Anhänge übrig sind, setze auf undefined
    if (attachments.length === 0) attachments = undefined
  }

  const mailOptions = {
    from: fromName ? `${fromName} <${fromAddress}>` : fromAddress,
    to: payload?.to,
    subject: payload?.subject || '',
    text: payload?.text || undefined,
    html: payload?.html || undefined,
    attachments,
  }

  const maxAttempts = 3
  let lastError = null
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const info = await transporter.sendMail(mailOptions)
      appendLog(app, { ok: true, to: payload?.to, subject: payload?.subject, id: info?.messageId, attempt })
      return { ok: true, id: info?.messageId }
    } catch (error) {
      lastError = error
      const message = String(error && error.message ? error.message : error)
      appendLog(app, { ok: false, error: message, attempt })
      // kleiner Backoff
      await new Promise(r => setTimeout(r, attempt * 500))
    }
  }
  const finalMsg = String(lastError && lastError.message ? lastError.message : lastError)
  return { ok: false, message: finalMsg }
}

module.exports = {
  sendMailWithOAuth2,
}


