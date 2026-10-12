import { DutchFormat } from '@mijn-duinzicht/dutch-format/DutchFormat';

import type { ClaimCategory } from '../../shared/model/Claim';

/** Dutch content the server stores for a new claim and a photo receipt. */
export const NEW_CLAIM_CONTENT = {
  titles: {
    home:      'Schade aan huis',
    car:       'Schade met auto',
    travel:    'Schade op reis',
    liability: 'Schade aan een ander',
  } satisfies Readonly<Record<ClaimCategory, string>>,
  reportedStep: {
    title:       'Schade gemeld',
    description: (reportedAt: string): string => DutchFormat.dateAndTime(reportedAt),
  },
  receivedStep: {
    title:       'Melding ontvangen',
    description: 'We wijzen je melding toe aan een behandelaar',
  },
  additionalInformationStep: {
    title:       'Aanvullende informatie',
    description: 'Als we meer van je nodig hebben, hoor je het van ons',
  },
  assessmentStep: {
    title:       'Beoordeling en uitbetaling',
    description: 'Binnen 5 werkdagen na ontvangst',
  },
  photosReceived: (count: number): string => (count === 1 ? '1 foto ontvangen' : `${count} foto's ontvangen`),
} as const;
