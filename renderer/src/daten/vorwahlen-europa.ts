// Europäische Vorwahlen (stark genutzte/alle EEA + weitere europäische Länder)
// Quelle konsolidiert aus ITU/E.164 (vereinfachte Auswahl). Namen auf Deutsch.

export type EuropaeischeVorwahl = {
  iso2: string
  name: string
  prefix: string
  flag: string
}

export const EU_VORWAHLEN: EuropaeischeVorwahl[] = [
  { iso2: 'AL', name: 'Albanien', prefix: '+355', flag: '🇦🇱' },
  { iso2: 'AD', name: 'Andorra', prefix: '+376', flag: '🇦🇩' },
  { iso2: 'AM', name: 'Armenien', prefix: '+374', flag: '🇦🇲' },
  { iso2: 'AT', name: 'Österreich', prefix: '+43', flag: '🇦🇹' },
  { iso2: 'AZ', name: 'Aserbaidschan', prefix: '+994', flag: '🇦🇿' },
  { iso2: 'BY', name: 'Belarus', prefix: '+375', flag: '🇧🇾' },
  { iso2: 'BE', name: 'Belgien', prefix: '+32', flag: '🇧🇪' },
  { iso2: 'BA', name: 'Bosnien und Herzegowina', prefix: '+387', flag: '🇧🇦' },
  { iso2: 'BG', name: 'Bulgarien', prefix: '+359', flag: '🇧🇬' },
  { iso2: 'HR', name: 'Kroatien', prefix: '+385', flag: '🇭🇷' },
  { iso2: 'CY', name: 'Zypern', prefix: '+357', flag: '🇨🇾' },
  { iso2: 'CZ', name: 'Tschechien', prefix: '+420', flag: '🇨🇿' },
  { iso2: 'DK', name: 'Dänemark', prefix: '+45', flag: '🇩🇰' },
  { iso2: 'EE', name: 'Estland', prefix: '+372', flag: '🇪🇪' },
  { iso2: 'FI', name: 'Finnland', prefix: '+358', flag: '🇫🇮' },
  { iso2: 'FR', name: 'Frankreich', prefix: '+33', flag: '🇫🇷' },
  { iso2: 'GE', name: 'Georgien', prefix: '+995', flag: '🇬🇪' },
  { iso2: 'DE', name: 'Deutschland', prefix: '+49', flag: '🇩🇪' },
  { iso2: 'GI', name: 'Gibraltar', prefix: '+350', flag: '🇬🇮' },
  { iso2: 'GR', name: 'Griechenland', prefix: '+30', flag: '🇬🇷' },
  { iso2: 'HU', name: 'Ungarn', prefix: '+36', flag: '🇭🇺' },
  { iso2: 'IS', name: 'Island', prefix: '+354', flag: '🇮🇸' },
  { iso2: 'IE', name: 'Irland', prefix: '+353', flag: '🇮🇪' },
  { iso2: 'IT', name: 'Italien', prefix: '+39', flag: '🇮🇹' },
  { iso2: 'KZ', name: 'Kasachstan', prefix: '+7', flag: '🇰🇿' },
  { iso2: 'XK', name: 'Kosovo', prefix: '+383', flag: '🇽🇰' },
  { iso2: 'LV', name: 'Lettland', prefix: '+371', flag: '🇱🇻' },
  { iso2: 'LI', name: 'Liechtenstein', prefix: '+423', flag: '🇱🇮' },
  { iso2: 'LT', name: 'Litauen', prefix: '+370', flag: '🇱🇹' },
  { iso2: 'LU', name: 'Luxemburg', prefix: '+352', flag: '🇱🇺' },
  { iso2: 'MT', name: 'Malta', prefix: '+356', flag: '🇲🇹' },
  { iso2: 'MD', name: 'Moldau', prefix: '+373', flag: '🇲🇩' },
  { iso2: 'MC', name: 'Monaco', prefix: '+377', flag: '🇲🇨' },
  { iso2: 'ME', name: 'Montenegro', prefix: '+382', flag: '🇲🇪' },
  { iso2: 'NL', name: 'Niederlande', prefix: '+31', flag: '🇳🇱' },
  { iso2: 'MK', name: 'Nordmazedonien', prefix: '+389', flag: '🇲🇰' },
  { iso2: 'NO', name: 'Norwegen', prefix: '+47', flag: '🇳🇴' },
  { iso2: 'PL', name: 'Polen', prefix: '+48', flag: '🇵🇱' },
  { iso2: 'PT', name: 'Portugal', prefix: '+351', flag: '🇵🇹' },
  { iso2: 'RO', name: 'Rumänien', prefix: '+40', flag: '🇷🇴' },
  { iso2: 'RU', name: 'Russland', prefix: '+7', flag: '🇷🇺' },
  { iso2: 'SM', name: 'San Marino', prefix: '+378', flag: '🇸🇲' },
  { iso2: 'RS', name: 'Serbien', prefix: '+381', flag: '🇷🇸' },
  { iso2: 'SK', name: 'Slowakei', prefix: '+421', flag: '🇸🇰' },
  { iso2: 'SI', name: 'Slowenien', prefix: '+386', flag: '🇸🇮' },
  { iso2: 'ES', name: 'Spanien', prefix: '+34', flag: '🇪🇸' },
  { iso2: 'SE', name: 'Schweden', prefix: '+46', flag: '🇸🇪' },
  { iso2: 'CH', name: 'Schweiz', prefix: '+41', flag: '🇨🇭' },
  { iso2: 'TR', name: 'Türkei', prefix: '+90', flag: '🇹🇷' },
  { iso2: 'UA', name: 'Ukraine', prefix: '+380', flag: '🇺🇦' },
  { iso2: 'GB', name: 'Vereinigtes Königreich', prefix: '+44', flag: '🇬🇧' },
  { iso2: 'VA', name: 'Vatikanstadt', prefix: '+379', flag: '🇻🇦' },
  { iso2: 'FO', name: 'Färöer', prefix: '+298', flag: '🇫🇴' },
  { iso2: 'GG', name: 'Guernsey', prefix: '+44', flag: '🇬🇬' },
  { iso2: 'JE', name: 'Jersey', prefix: '+44', flag: '🇯🇪' },
  { iso2: 'IM', name: 'Isle of Man', prefix: '+44', flag: '🇮🇲' },
  { iso2: 'AX', name: 'Åland', prefix: '+358', flag: '🇦🇽' },
  { iso2: 'GL', name: 'Grönland', prefix: '+299', flag: '🇬🇱' },
  { iso2: 'SJ', name: 'Svalbard und Jan Mayen', prefix: '+47', flag: '🇸🇯' },
]

export function findeVorwahlLabel(v: EuropaeischeVorwahl): string {
  return `${v.flag} ${v.iso2} (${v.prefix})`
}



