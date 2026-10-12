import type { PortalSection } from '../../shared/sections/PortalPath';

/** Every Dutch text of the shell. */
export const SHELL_COPY = {
  helpAndContact:        'Hulp & contact',
  reportClaim:           'Schade melden',
  logOut:                'Uitloggen',
  unavailableInDemo:     'Niet beschikbaar in deze demo',
  wordmarkName:          'duinzicht',
  wordmarkDot:           '.',
  wordmarkTagline:       'Verzekeringen',
  wordmarkLinkName:      'Duinzicht Verzekeringen, naar je overzicht',
  primaryNavigationName: 'Hoofdmenu',
  utilityNavigationName: 'Servicemenu',
  openMenu:              'Menu openen',
  closeMenu:             'Menu sluiten',
  skipToContent:         'Naar de inhoud',
  customerNumberPrefix:  'Klantnr. ',
  notFoundHeading:       'Pagina niet gevonden',
  notFoundLead:          'De pagina die je zoekt bestaat niet (meer). Controleer het adres of ga terug naar je overzicht.',
  notFoundButton:        'Naar mijn overzicht',
  documentTitles:        {
    overview: 'Overzicht · Mijn Duinzicht',
    policies: 'Polissen · Mijn Duinzicht',
    claims:   'Schade · Mijn Duinzicht',
    messages: 'Berichten · Mijn Duinzicht',
    profile:  'Profiel · Mijn Duinzicht',
    notFound: 'Pagina niet gevonden · Mijn Duinzicht',
  } satisfies Readonly<Record<PortalSection, string>>,
} as const;
