import { writeFile } from 'node:fs/promises';
import { join }      from 'node:path';

/** A complete seed document with obviously synthetic values, in the seed file's shape, for specs that build stores. */
export function syntheticSeedDocument(): Record<string, unknown> {
  return {
    formatVersion: 1,
    customer:      {
      customerNumber:                '12345678',
      fullName:                      'Alex Example',
      firstName:                     'Alex',
      initials:                      'AE',
      birthDate:                     '2000-01-02',
      emailAddress:                  'alex@example.com',
      emailAddressNeedsConfirmation: false,
      emailAddressLastConfirmedYear: 2020,
      phoneNumber:                   '06 00 00 00 00',
      address:                       { streetAndHouseNumber: 'Example Street 1', postcode: '1234 AB', city: 'Example City' },
      iban:                          'NL00 EXAM 0000 0000 00',
      paymentMethod:                 'automatische incasso maandelijks',
      accountHolder:                 'A. Example',
    },
    preferences:         { paperMail: true, newsletter: false, claimUpdateTextMessages: false },
    directDebitSchedule: { nextCollectionDate: '2099-01-01' },
    policies:            [
      {
        id:                  'EX-POLICY-1',
        type:                'auto',
        name:                'Example policy',
        subtitle:            'Example subtitle',
        monthlyPremiumEuros: '12.30',
        status:              'beeindigd',
        facts:               [{ label: 'Example label', value: 'Example value' }],
        coverage:            ['Example coverage'],
      },
    ],
    claims: [
      {
        id:            'S-2099-0001',
        title:         'Example claim',
        category:      'reis',
        policyId:      'EX-POLICY-1',
        reportedAt:    '2099-01-02T03:04',
        status:        'gemeld',
        handlerName:   null,
        photoDeadline: null,
        steps:         [{
          title: 'Example step', description: 'Example description', state: 'current', waitsForPhotos: false 
        }],
      },
    ],
    messages: [{
      id: 'EX-MESSAGE-1', title: 'Example message', sentOn: '2099-02-03', isRead: true, body: 'Example body' 
    }],
  };
}

/** Writes the synthetic seed document into `directory` and returns its path. */
export async function writeSyntheticSeed(directory: string): Promise<string> {
  const seedPath = join(directory, 'synthetic-seed.json');
  await writeFile(seedPath, JSON.stringify(syntheticSeedDocument()));
  return seedPath;
}
