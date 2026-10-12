/**
 * Pins the policy reads against the real server on a scratch store: the four seed policies in seed
 * order with their 16 facts and 12 coverage items verbatim, and the policy sheet of each: a one-page
 * PDF named `polisblad-{number}.pdf` holding the sheet's texts, refused for an unknown id. Seed values
 * appear here because this suite asserts against the seed.
 */
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from 'bun:test';

import { type ScratchApiServer, startScratchApiServer } from './ScratchApiServer.setup';

const SEED_POLICIES = [
  {
    policyNumber: 'DZ-WH-118204',
    name:         'Woonhuisverzekering',
    facts:        [
      { label: 'Premie', value: '€ 32,10 p/m' },
      { label: 'Eigen risico', value: '€ 250' },
      { label: 'Herbouwwaarde', value: '€ 412.000' },
      { label: 'Ingangsdatum', value: '1 mrt 2021' },
    ],
    coverage: ['Brand, storm en inbraak', 'Waterschade door leidingen', 'Glas (optioneel, meeverzekerd)'],
  },
  {
    policyNumber: 'DZ-IB-118205',
    name:         'Inboedelverzekering',
    facts:        [
      { label: 'Premie', value: '€ 14,75 p/m' },
      { label: 'Eigen risico', value: '€ 100' },
      { label: 'Verzekerd bedrag', value: 'Garantie' },
      { label: 'Ingangsdatum', value: '1 mrt 2021' },
    ],
    coverage: ['Brand en inbraak', 'Waterschade', 'Buitenshuisdekking'],
  },
  {
    policyNumber: 'DZ-AU-902117',
    name:         'Autoverzekering',
    facts:        [
      { label: 'Premie', value: '€ 41,60 p/m' },
      { label: 'Eigen risico', value: '€ 300' },
      { label: 'Kenteken', value: 'GH-482-K' },
      { label: 'Schadevrije jaren', value: '9' },
    ],
    coverage: ['WA', 'Volledig casco (allrisk)', 'Pechhulp Europa'],
  },
  {
    policyNumber: 'DZ-AV-330981',
    name:         'Aansprakelijkheid',
    facts:        [
      { label: 'Premie', value: '€ 10,00 p/m' },
      { label: 'Eigen risico', value: '€ 0' },
      { label: 'Gezinssamenstelling', value: 'Gezin' },
      { label: 'Ingangsdatum', value: '1 jan 2020' },
    ],
    coverage: ['Schade aan anderen', 'Schade door kinderen', 'Schade door huisdieren'],
  },
] as const;

let scratchServer: ScratchApiServer;

beforeAll(async () => {
  scratchServer = await startScratchApiServer();
});

afterAll(async () => {
  await scratchServer.stop();
});

async function answerTo(path: string): Promise<{ status: number; body: unknown }> {
  const response = await fetch(`${scratchServer.origin}${path}`);
  return { status: response.status, body: await response.json() };
}

describe('policy reads', () => {
  it('lists the four seed policies in seed order, all active', async () => {
    const { status, body } = await answerTo('/api/policies');

    expect(status).toBe(200);
    expect(body).toMatchObject({
      policies: SEED_POLICIES.map((policy) => ({
        id: policy.policyNumber, policyNumber: policy.policyNumber, name: policy.name, status: 'active',
      })),
    });
    expect((body as { policies: unknown[] }).policies.length).toBe(SEED_POLICIES.length);
  });

  it('answers each policy with its facts and coverage verbatim and in order, 16 facts and 12 coverage items in all', async () => {
    let factCount = 0;
    let coverageCount = 0;
    for (const policy of SEED_POLICIES) {
      const { status, body } = await answerTo(`/api/policies/${policy.policyNumber}`);

      expect(status).toBe(200);
      expect(body).toMatchObject({
        id: policy.policyNumber, policyNumber: policy.policyNumber, name: policy.name, status: 'active', facts: policy.facts, coverage: policy.coverage,
      });
      const { facts, coverage } = body as { facts: unknown[]; coverage: unknown[] };
      expect({ facts: facts.length, coverage: coverage.length }).toEqual({ facts: policy.facts.length, coverage: policy.coverage.length });
      factCount += facts.length;
      coverageCount += coverage.length;
    }

    expect({ factCount, coverageCount }).toEqual({ factCount: 16, coverageCount: 12 });
  });
});

function latin1TextOf(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (byte) => String.fromCharCode(byte)).join('');
}

describe('policy sheet', () => {
  it('offers each seed policy as a one-page PDF named after its number and naming the policy and the customer', async () => {
    for (const policy of SEED_POLICIES) {
      const response = await fetch(`${scratchServer.origin}/api/policies/${policy.policyNumber}/policy-sheet`);
      const documentText = latin1TextOf(await response.arrayBuffer());

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('application/pdf');
      expect(response.headers.get('content-disposition')).toContain(`filename="polisblad-${policy.policyNumber}.pdf"`);
      expect(documentText).toStartWith('%PDF-');
      expect(documentText.match(/\/Type\s*\/Page(?!s)/g)?.length).toBe(1);
      for (const line of ['Polisblad', policy.name, `Polisnummer ${policy.policyNumber}`, 'Sanne de Vries']) {
        expect(documentText).toContain(`(${line}) Tj`);
      }
    }
  });

  it('refuses the policy sheet of an unknown policy with 404 notFound', async () => {
    const { status, body } = await answerTo('/api/policies/DZ-XX-000000/policy-sheet');

    expect(status).toBe(404);
    expect(body).toMatchObject({ error: { code: 'notFound' } });
  });
});
