# GitHub Release Anleitung

Diese Anleitung erklärt, wie du einen GitHub Release für die 24h Pflege App veröffentlichst.

## 📋 Voraussetzungen

### 1. GitHub Repository
- Das Projekt muss auf GitHub hochgeladen sein
- Repository-Name sollte mit der Konfiguration in `package.json` übereinstimmen:
  - Aktuell konfiguriert: `samuelhaunschmid-web/24HPflege-updates`
  - Falls anders, in `package.json` unter `build.publish[0].repo` anpassen

### 2. GitHub Personal Access Token (PAT)
Ein Token mit folgenden Berechtigungen:
- `repo` (voller Zugriff auf Repositories)
- `write:packages` (optional, falls du Packages veröffentlichen willst)

**Token erstellen:**
1. Gehe zu GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Klicke auf "Generate new token (classic)"
3. Wähle die Berechtigungen aus
4. Kopiere den Token (wird nur einmal angezeigt!)

### 3. Token als Secret speichern (für GitHub Actions)
1. Gehe zu deinem GitHub Repository
2. Settings → Secrets and variables → Actions
3. Klicke auf "New repository secret"
4. Name: `GH_TOKEN` (oder `GITHUB_TOKEN`)
5. Wert: Dein Personal Access Token

## 🚀 Methoden zum Veröffentlichen

### Methode 1: Automatisch mit GitHub Actions (Empfohlen)

**Vorteile:**
- Automatischer Build auf GitHub Servern
- Keine lokalen Builds nötig
- Konsistente Build-Umgebung

**Schritte:**
1. Stelle sicher, dass `.github/workflows/release.yml` existiert (bereits erstellt)
2. Initialisiere Git Repository (falls noch nicht geschehen):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/DEIN_USERNAME/DEIN_REPO.git
   git push -u origin main
   ```
3. Erstelle einen Tag für die neue Version:
   ```bash
   git tag v1.0.5  # Version aus package.json verwenden
   git push origin v1.0.5
   ```
4. GitHub Actions startet automatisch den Build und erstellt den Release

**Manueller Trigger:**
- Gehe zu GitHub → Actions → "Build and Release"
- Klicke auf "Run workflow"

### Methode 2: Manuell mit electron-builder

**Schritte:**
1. Stelle sicher, dass `GH_TOKEN` als Umgebungsvariable gesetzt ist:
   ```powershell
   # Windows PowerShell
   $env:GH_TOKEN = "dein_token_hier"
   ```
2. Version in `package.json` erhöhen (z.B. von `1.0.4` auf `1.0.5`)
3. Build ausführen:
   ```bash
   npm run build
   ```
4. electron-builder lädt automatisch die Artefakte zu GitHub Releases hoch

### Methode 3: Manuell über GitHub Web Interface

**Schritte:**
1. Baue die App lokal:
   ```bash
   npm run build
   ```
2. Gehe zu GitHub → Releases → "Draft a new release"
3. Wähle oder erstelle einen Tag (z.B. `v1.0.5`)
4. Titel: z.B. "Version 1.0.5"
5. Beschreibung: Release Notes hinzufügen
6. Lade die Build-Artefakte hoch:
   - `releases/24StundenPflege Setup 1.0.5.exe` (NSIS Installer)
   - `releases/24StundenPflege-1.0.5-portable.exe` (Portable Version, falls erstellt)
7. Klicke auf "Publish release"

## 📝 Wichtige Konfigurationen

### package.json
Die aktuelle Konfiguration:
```json
"publish": [
  {
    "provider": "github",
    "owner": "samuelhaunschmid-web",
    "repo": "24HPflege-updates",
    "releaseType": "release"
  }
]
```

**Anpassen falls nötig:**
- `owner`: Dein GitHub Username
- `repo`: Name deines GitHub Repositories
- `releaseType`: `release` (stable), `prerelease` (beta), oder `draft` (Entwurf)

## 🔄 Workflow für neue Releases

1. **Version erhöhen** in `package.json`:
   ```json
   "version": "1.0.5"
   ```

2. **Änderungen committen**:
   ```bash
   git add package.json
   git commit -m "Bump version to 1.0.5"
   git push
   ```

3. **Tag erstellen und pushen**:
   ```bash
   git tag v1.0.5
   git push origin v1.0.5
   ```

4. **GitHub Actions baut automatisch** und erstellt den Release

## ✅ Checkliste vor dem Release

- [ ] Version in `package.json` erhöht
- [ ] Alle Änderungen getestet
- [ ] Changelog/Release Notes vorbereitet
- [ ] GitHub Token konfiguriert (für automatische Methode)
- [ ] Repository-Name in `package.json` korrekt
- [ ] Build lokal getestet (`npm run build`)

## 🐛 Troubleshooting

### "GH_TOKEN not found"
- Stelle sicher, dass der Token als Umgebungsvariable gesetzt ist
- Oder als GitHub Secret konfiguriert ist

### "Repository not found"
- Prüfe, ob der Repository-Name in `package.json` korrekt ist
- Prüfe, ob du Zugriff auf das Repository hast

### "Release already exists"
- Lösche den bestehenden Release auf GitHub
- Oder erhöhe die Version

### Build schlägt fehl
- Prüfe die GitHub Actions Logs
- Stelle sicher, dass alle Dependencies installiert sind
- Prüfe, ob Node.js Version kompatibel ist

## 📚 Weitere Ressourcen

- [electron-builder Dokumentation](https://www.electron.build/)
- [GitHub Releases API](https://docs.github.com/en/rest/releases/releases)
- [GitHub Actions Dokumentation](https://docs.github.com/en/actions)

