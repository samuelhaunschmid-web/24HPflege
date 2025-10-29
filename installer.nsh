; Custom NSIS installer script for 24h Pflege App

; Set installer language to German
!define MUI_LANG "German"

; Custom installer pages
!define MUI_WELCOMEPAGE_TITLE "Willkommen zur 24h Pflege App"
!define MUI_WELCOMEPAGE_TEXT "Diese Anwendung wird Sie durch die Installation der 24h Pflege Verwaltungs-App führen.$\r$\n$\r$\nDie App wird automatisch eine Desktop-Verknüpfung und einen Startmenü-Eintrag erstellen."

; Finish page
!define MUI_FINISHPAGE_TITLE "Installation abgeschlossen"
!define MUI_FINISHPAGE_TEXT "Die 24h Pflege App wurde erfolgreich installiert.$\r$\n$\r$\nSie können die App jetzt über die Desktop-Verknüpfung oder das Startmenü starten."

; License page (optional)
!define MUI_LICENSEPAGE_TEXT_TOP "Bitte lesen Sie die Lizenzvereinbarung sorgfältig durch."

; Directory page
!define MUI_DIRECTORYPAGE_TEXT_TOP "Der Installer wird die 24h Pflege App in den folgenden Ordner installieren.$\r$\n$\r$\nUm die App in einem anderen Ordner zu installieren, klicken Sie auf Durchsuchen und wählen Sie einen anderen Ordner."

; Uninstaller
!define MUI_UNCONFIRMPAGE_TEXT_TOP "Die 24h Pflege App wird von Ihrem Computer entfernt.$\r$\n$\r$\nKlicken Sie auf Entfernen, um die Deinstallation fortzusetzen."

; Registry entries for better integration
!macro customInstall
  ; Create registry entries for better Windows integration
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\24StundenPflege" "DisplayName" "24h Pflege Verwaltungs-App"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\24StundenPflege" "DisplayVersion" "1.0.2"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\24StundenPflege" "Publisher" "Samuel Haunschmid"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\24StundenPflege" "UninstallString" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\24StundenPflege" "InstallLocation" "$INSTDIR"
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\24StundenPflege" "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\24StundenPflege" "NoRepair" 1
!macroend

!macro customUnInstall
  ; Clean up registry entries
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\24StundenPflege"
!macroend
