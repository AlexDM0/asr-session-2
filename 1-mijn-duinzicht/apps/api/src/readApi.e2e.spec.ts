/**
 * Pins every read endpoint against the real server on a scratch store seeded from the bundled seed,
 * so each value is asserted verbatim from the seed (the one kind of suite where that is allowed). Also
 * pinned: not-found for unknown and differently cased ids, routeNotFound, 405 only with DELETE (a
 * method no route offers), fail closed on corrupted stored values, persistence
 * across a restart and the reset.
 */
import { Database } from 'bun:sqlite';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from 'bun:test';

import { type ScratchApiServer, startScratchApiServer } from './ScratchApiServer.setup';

let scratchServer: ScratchApiServer;

beforeAll(async () => {
  scratchServer = await startScratchApiServer();
});

afterAll(async () => {
  await scratchServer.stop();
});

async function answerTo(path: string, method = 'GET'): Promise<{ status: number; body: unknown }> {
  const response = await fetch(`${scratchServer.origin}${path}`, { method });
  return { status: response.status, body: await response.json() };
}

function changeScratchStore(statement: string): void {
  const connection = new Database(scratchServer.databasePath, { strict: true });
  connection.run('PRAGMA ignore_check_constraints = ON');
  connection.run(statement);
  connection.close();
}

const SEED_POLICIES = [
  {
    id: 'DZ-WH-118204', policyNumber: 'DZ-WH-118204', kind: 'home', name: 'Woonhuisverzekering', subtitle: 'Lindelaan 12, Utrecht', monthlyPremiumCents: 3210, status: 'active',
  },
  {
    id: 'DZ-IB-118205', policyNumber: 'DZ-IB-118205', kind: 'contents', name: 'Inboedelverzekering', subtitle: 'Lindelaan 12, Utrecht', monthlyPremiumCents: 1475, status: 'active',
  },
  {
    id: 'DZ-AU-902117', policyNumber: 'DZ-AU-902117', kind: 'car', name: 'Autoverzekering', subtitle: 'Allrisk · GH-482-K', monthlyPremiumCents: 4160, status: 'active',
  },
  {
    id: 'DZ-AV-330981', policyNumber: 'DZ-AV-330981', kind: 'liability', name: 'Aansprakelijkheid', subtitle: 'Gezin', monthlyPremiumCents: 1000, status: 'active',
  },
];

const SEED_POLICY_DETAILS = [
  {
    ...SEED_POLICIES[0],
    facts: [
      { label: 'Premie', value: '€ 32,10 p/m' },
      { label: 'Eigen risico', value: '€ 250' },
      { label: 'Herbouwwaarde', value: '€ 412.000' },
      { label: 'Ingangsdatum', value: '1 mrt 2021' },
    ],
    coverage: ['Brand, storm en inbraak', 'Waterschade door leidingen', 'Glas (optioneel, meeverzekerd)'],
  },
  {
    ...SEED_POLICIES[1],
    facts: [
      { label: 'Premie', value: '€ 14,75 p/m' },
      { label: 'Eigen risico', value: '€ 100' },
      { label: 'Verzekerd bedrag', value: 'Garantie' },
      { label: 'Ingangsdatum', value: '1 mrt 2021' },
    ],
    coverage: ['Brand en inbraak', 'Waterschade', 'Buitenshuisdekking'],
  },
  {
    ...SEED_POLICIES[2],
    facts: [
      { label: 'Premie', value: '€ 41,60 p/m' },
      { label: 'Eigen risico', value: '€ 300' },
      { label: 'Kenteken', value: 'GH-482-K' },
      { label: 'Schadevrije jaren', value: '9' },
    ],
    coverage: ['WA', 'Volledig casco (allrisk)', 'Pechhulp Europa'],
  },
  {
    ...SEED_POLICIES[3],
    facts: [
      { label: 'Premie', value: '€ 10,00 p/m' },
      { label: 'Eigen risico', value: '€ 0' },
      { label: 'Gezinssamenstelling', value: 'Gezin' },
      { label: 'Ingangsdatum', value: '1 jan 2020' },
    ],
    coverage: ['Schade aan anderen', 'Schade door kinderen', 'Schade door huisdieren'],
  },
];

const SEED_CLAIM_DETAILS = {
  'S-2026-0418': {
    id:                   'S-2026-0418',
    title:                'Waterschade badkamer',
    category:             'home',
    policyId:             'DZ-WH-118204',
    policyName:           'Woonhuisverzekering',
    reportedAt:           '2026-10-06T09:14',
    status:               'inProgress',
    handlerName:          'Joost Meijer',
    awaitsCustomerPhotos: true,
    incidentDate:         null,
    description:          null,
    photoDeadline:        '2026-10-15',
    steps:                [
      {
        title: 'Schade gemeld', description: '6 oktober 2026, 09:14', state: 'done', waitsForPhotos: false 
      },
      {
        title: 'Melding ontvangen', description: 'Behandelaar: Joost Meijer', state: 'done', waitsForPhotos: false 
      },
      {
        title: 'Aanvullende informatie', description: 'Wacht op foto\'s van jou', state: 'current', waitsForPhotos: true 
      },
      {
        title: 'Beoordeling en uitbetaling', description: 'Binnen 5 werkdagen na ontvangst', state: 'todo', waitsForPhotos: false 
      },
    ],
  },
  'S-2025-0127': {
    id:                   'S-2025-0127',
    title:                'Ruitschade voorruit',
    category:             'car',
    policyId:             'DZ-AU-902117',
    policyName:           'Autoverzekering',
    reportedAt:           '2025-05-14T11:20',
    status:               'paidOut',
    handlerName:          'Lotte Bakker',
    awaitsCustomerPhotos: false,
    incidentDate:         null,
    description:          null,
    photoDeadline:        null,
    steps:                [
      {
        title: 'Schade gemeld', description: '14 mei 2025, 11:20', state: 'done', waitsForPhotos: false 
      },
      {
        title: 'Melding ontvangen', description: 'Behandelaar: Lotte Bakker', state: 'done', waitsForPhotos: false 
      },
      {
        title: 'Aanvullende informatie', description: 'Foto\'s ontvangen', state: 'done', waitsForPhotos: false 
      },
      {
        title: 'Beoordeling en uitbetaling', description: 'Uitbetaald op 21 mei 2025', state: 'done', waitsForPhotos: false 
      },
    ],
  },
  'S-2023-0352': {
    id:                   'S-2023-0352',
    title:                'Gestolen fiets',
    category:             'home',
    policyId:             'DZ-IB-118205',
    policyName:           'Inboedelverzekering',
    reportedAt:           '2023-11-06T08:47',
    status:               'paidOut',
    handlerName:          'Joost Meijer',
    awaitsCustomerPhotos: false,
    incidentDate:         null,
    description:          null,
    photoDeadline:        null,
    steps:                [
      {
        title: 'Schade gemeld', description: '6 november 2023, 08:47', state: 'done', waitsForPhotos: false 
      },
      {
        title: 'Melding ontvangen', description: 'Behandelaar: Joost Meijer', state: 'done', waitsForPhotos: false 
      },
      {
        title: 'Aanvullende informatie', description: 'Aangifte van diefstal ontvangen', state: 'done', waitsForPhotos: false 
      },
      {
        title: 'Beoordeling en uitbetaling', description: 'Uitbetaald op 17 november 2023', state: 'done', waitsForPhotos: false 
      },
    ],
  },
};

const SEED_MESSAGE_BODIES = {
  'M-2026-0103': 'Hoi Sanne,\n\nWe hebben je schademelding S-2026-0418 (Waterschade badkamer) op 6 oktober 2026 ontvangen. Joost Meijer behandelt je melding.\n\n'
    + 'Wil je foto\'s van de schade uploaden? Dan kunnen we je melding afronden. Upload ze uiterlijk 15 oktober 2026 bij Schade.\n\nGroet,\nDuinzicht Verzekeringen',
  'M-2026-0087': 'Hoi Sanne,\n\nEr staat een nieuw polisblad klaar voor je autoverzekering (DZ-AU-902117). Je dekking en je premie van € 41,60 per maand blijven gelijk. '
    + 'Je vindt het polisblad bij Polissen.\n\nGroet,\nDuinzicht Verzekeringen',
  'M-2026-0021': 'Hoi Sanne,\n\nJe jaaroverzicht 2025 staat klaar. Je ziet daarin welke premies je in 2025 hebt betaald. Bewaar het overzicht goed, '
    + 'bijvoorbeeld voor je administratie.\n\nGroet,\nDuinzicht Verzekeringen',
};

const SEED_MESSAGES = [
  {
    id: 'M-2026-0103', title: 'Ontvangstbevestiging schademelding', sentOn: '2026-10-06', isRead: false,
  },
  {
    id: 'M-2026-0087', title: 'Nieuw polisblad autoverzekering', sentOn: '2026-09-01', isRead: true,
  },
  {
    id: 'M-2026-0021', title: 'Jaaroverzicht 2025', sentOn: '2026-02-12', isRead: true,
  },
];

describe('read API against the seed', () => {
  it('answers the profile with every seed value', async () => {
    expect(await answerTo('/api/profile')).toEqual({
      status: 200,
      body:   {
        customerNumber:                '40218773',
        fullName:                      'Sanne de Vries',
        firstName:                     'Sanne',
        initials:                      'SV',
        birthDate:                     '1988-06-14',
        emailAddress:                  'sanne.devries@example.nl',
        emailAddressNeedsConfirmation: true,
        emailAddressLastConfirmedYear: 2023,
        phoneNumber:                   '06 12 34 56 78',
        address:                       { streetAndHouseNumber: 'Lindelaan 12', postcode: '3521 AB', city: 'Utrecht' },
        iban:                          'NL91 INGB 0001 2348 21',
        paymentMethod:                 'monthlyDirectDebit',
        accountHolder:                 'S. de Vries',
      },
    });
  });

  it('answers the preferences: paper mail off, newsletter on, text messages on', async () => {
    expect(await answerTo('/api/preferences')).toEqual({ status: 200, body: { paperMail: false, newsletter: true, claimUpdateTextMessages: true } });
  });

  it('answers the four policies in seed order with premiums 3210, 1475, 4160 and 1000', async () => {
    expect(await answerTo('/api/policies')).toEqual({ status: 200, body: { policies: SEED_POLICIES } });
  });

  it('answers each policy detail with its ordered facts and coverage', async () => {
    for (const policyDetail of SEED_POLICY_DETAILS) {
      expect(await answerTo(`/api/policies/${policyDetail.id}`)).toEqual({ status: 200, body: policyDetail });
    }
  });

  it('offers the policy sheet as a one-page PDF named after the policy number, holding its five lines', async () => {
    const response = await fetch(`${scratchServer.origin}/api/policies/DZ-WH-118204/policy-sheet`);
    const text = Array.from(new Uint8Array(await response.arrayBuffer()), (byte) => String.fromCharCode(byte)).join('');

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/pdf');
    expect(response.headers.get('content-disposition')).toBe('attachment; filename="polisblad-DZ-WH-118204.pdf"');
    expect(text).toStartWith('%PDF-1.4');
    expect(text).toContain('/Count 1');
    for (const line of ['Polisblad', 'Woonhuisverzekering', 'Polisnummer DZ-WH-118204', 'Sanne de Vries', 'Dit is een voorbeelddocument van Duinzicht Verzekeringen.']) {
      expect(text).toContain(`(${line}) Tj`);
    }
  });

  it('answers the claims open first, then newest first: 0418, 0127, 0352', async () => {
    const { status, body } = await answerTo('/api/claims');

    expect(status).toBe(200);
    expect(body).toEqual({
      claims: Object.values(SEED_CLAIM_DETAILS).map((claimDetail) => ({
        id:                   claimDetail.id,
        title:                claimDetail.title,
        category:             claimDetail.category,
        policyId:             claimDetail.policyId,
        policyName:           claimDetail.policyName,
        reportedAt:           claimDetail.reportedAt,
        status:               claimDetail.status,
        handlerName:          claimDetail.handlerName,
        stepStates:           claimDetail.steps.map((step) => step.state),
        awaitsCustomerPhotos: claimDetail.awaitsCustomerPhotos,
      })),
    });
  });

  it('answers claim S-2026-0418 with steps done, done, current, todo and photo deadline 2026-10-15', async () => {
    expect(await answerTo('/api/claims/S-2026-0418')).toEqual({ status: 200, body: SEED_CLAIM_DETAILS['S-2026-0418'] });
  });

  it('answers the two paid-out claims in detail', async () => {
    expect(await answerTo('/api/claims/S-2025-0127')).toEqual({ status: 200, body: SEED_CLAIM_DETAILS['S-2025-0127'] });
    expect(await answerTo('/api/claims/S-2023-0352')).toEqual({ status: 200, body: SEED_CLAIM_DETAILS['S-2023-0352'] });
  });

  it('answers the messages newest first: 0103, 0087, 0021', async () => {
    expect(await answerTo('/api/messages')).toEqual({ status: 200, body: { messages: SEED_MESSAGES } });
  });

  it('answers each message detail with its body, paragraphs separated by a blank line', async () => {
    for (const message of SEED_MESSAGES) {
      expect(await answerTo(`/api/messages/${message.id}`)).toEqual({
        status: 200,
        body:   { ...message, body: SEED_MESSAGE_BODIES[message.id as keyof typeof SEED_MESSAGE_BODIES] },
      });
    }
  });

  it('answers the next payment: 2026-11-01, 9845 cents, NL•• INGB •••• 4821', async () => {
    expect(await answerTo('/api/payments/next')).toEqual({
      status: 200,
      body:   { nextPayment: { collectionDate: '2026-11-01', amountCents: 9845, maskedAccount: 'NL•• INGB •••• 4821' } },
    });
  });

  it('answers exactly two open actions: the photo upload for S-2026-0418, then the e-mail confirmation', async () => {
    expect(await answerTo('/api/open-actions')).toEqual({
      status: 200,
      body:   {
        openActions: [
          {
            kind: 'uploadClaimPhotos', claimId: 'S-2026-0418', claimTitle: 'Waterschade badkamer', deadline: '2026-10-15',
          },
          { kind: 'confirmEmailAddress', lastConfirmedYear: 2023 },
        ],
      },
    });
  });
});

describe('read API refusals', () => {
  it('answers 404 notFound for an unknown policy, claim and message, and for a differently cased policy id', async () => {
    const unknownPaths = [
      '/api/policies/DZ-XX-000000',
      '/api/claims/S-0000-0000',
      '/api/messages/M-0000-0000',
      '/api/policies/dz-wh-118204',
      '/api/policies/DZ-XX-000000/policy-sheet',
    ];
    for (const path of unknownPaths) {
      const { status, body } = await answerTo(path);

      expect(status).toBe(404);
      expect(body).toMatchObject({ error: { code: 'notFound' } });
    }
  });

  it('answers 404 routeNotFound for an unknown API path and for a trailing-slash variant', async () => {
    for (const path of ['/api/example-unknown', '/api/policies/', '/api/policies/DZ-WH-118204/example']) {
      const { status, body } = await answerTo(path);

      expect(status).toBe(404);
      expect(body).toMatchObject({ error: { code: 'routeNotFound' } });
    }
  });

  it('answers 405 operationNotOffered for DELETE on every write path', async () => {
    const writePaths = [
      '/api/claims',
      '/api/claims/S-2026-0418/photos',
      '/api/profile/contact-details',
      '/api/profile/payment-details',
      '/api/preferences',
      '/api/messages/M-2026-0103/read',
    ];
    for (const path of writePaths) {
      const { status, body } = await answerTo(path, 'DELETE');

      expect(status).toBe(405);
      expect(body).toMatchObject({ error: { code: 'operationNotOffered' } });
    }
  });
});

describe('read API on a changed store', () => {
  afterEach(async () => {
    await scratchServer.reset();
  });

  it('fails closed with 500 invalidStoredValue on a status that is not a known internal value', async () => {
    changeScratchStore('UPDATE claim SET status = \'exampleStatus\' WHERE claim_id = \'S-2025-0127\'');

    const { status, body } = await answerTo('/api/claims');

    expect(status).toBe(500);
    expect(body).toMatchObject({ error: { code: 'invalidStoredValue' } });
    expect(JSON.stringify(body)).not.toContain('Waterschade badkamer');
  });

  it('fails closed with 500 invalidStoredValue on a malformed amount', async () => {
    changeScratchStore('UPDATE policy SET monthly_premium_cents = -5 WHERE policy_id = \'DZ-AV-330981\'');

    expect((await answerTo('/api/policies')).status).toBe(500);
    expect((await answerTo('/api/payments/next')).body).toMatchObject({ error: { code: 'invalidStoredValue' } });
  });

  it('fails closed with 500 invalidStoredValue on a malformed date', async () => {
    changeScratchStore('UPDATE message SET sent_on = \'2026-02-30\' WHERE message_id = \'M-2026-0021\'');

    expect(await answerTo('/api/messages/M-2026-0021')).toMatchObject({ status: 500, body: { error: { code: 'invalidStoredValue' } } });
  });

  it('still returns a changed value after the server restarts', async () => {
    changeScratchStore('UPDATE preferences SET newsletter = 0');

    await scratchServer.restart();

    expect(await answerTo('/api/preferences')).toEqual({ status: 200, body: { paperMail: false, newsletter: false, claimUpdateTextMessages: true } });
  });

  it('returns the seed values again after the reset', async () => {
    changeScratchStore('UPDATE claim_step SET state = \'done\' WHERE claim_id = \'S-2026-0418\'');
    changeScratchStore('UPDATE customer SET email_address_needs_confirmation = 0');

    await scratchServer.reset();

    expect((await answerTo('/api/claims/S-2026-0418')).body).toEqual(SEED_CLAIM_DETAILS['S-2026-0418']);
    expect((await answerTo('/api/open-actions')).body).toEqual({
      openActions: [
        {
          kind: 'uploadClaimPhotos', claimId: 'S-2026-0418', claimTitle: 'Waterschade badkamer', deadline: '2026-10-15',
        },
        { kind: 'confirmEmailAddress', lastConfirmedYear: 2023 },
      ],
    });
  });
});
