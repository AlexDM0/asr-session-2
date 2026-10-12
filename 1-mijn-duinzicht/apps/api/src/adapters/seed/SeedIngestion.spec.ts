/**
 * The seed ingestion is the boundary between the seed file and the internal model. The cases that
 * matter: a valid synthetic document maps completely, decimal euro strings become exact cents, an
 * unsupported format version is refused, and every missing or malformed field is named by its path.
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir }                 from 'node:os';
import { join }                   from 'node:path';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from 'bun:test';

import { SeedIngestion, bundledSeedPath } from './SeedIngestion';
import { syntheticSeedDocument }          from './syntheticSeedDocument.setup';

let temporaryDirectory = '';

beforeEach(async () => {
  temporaryDirectory = await mkdtemp(join(tmpdir(), 'seed-ingestion-'));
});

afterEach(async () => {
  await rm(temporaryDirectory, { recursive: true, force: true });
});

async function seedPathFor(document: unknown): Promise<string> {
  const seedPath = join(temporaryDirectory, 'seed.json');
  await writeFile(seedPath, JSON.stringify(document));
  return seedPath;
}

describe('SeedIngestion', () => {
  it('maps a valid document into the internal model with English internal values', async () => {
    const verdict = await new SeedIngestion(await seedPathFor(syntheticSeedDocument())).read();

    expect(verdict.outcome).toBe('valid');
    if (verdict.outcome !== 'valid') {
      return;
    }
    expect(verdict.seed.customer.paymentMethod).toBe('monthlyDirectDebit');
    expect(verdict.seed.customer.address.city).toBe('Example City');
    expect(verdict.seed.preferences).toEqual({ paperMail: true, newsletter: false, claimUpdateTextMessages: false });
    expect(verdict.seed.directDebitSchedule).toEqual({ nextCollectionDate: '2099-01-01' });
    expect(verdict.seed.policies[0]).toEqual({
      id:                  'EX-POLICY-1',
      kind:                'car',
      name:                'Example policy',
      subtitle:            'Example subtitle',
      monthlyPremiumCents: 1230,
      status:              'ended',
      facts:               [{ label: 'Example label', value: 'Example value' }],
      coverage:            ['Example coverage'],
    });
    expect(verdict.seed.claims[0]).toEqual({
      id:            'S-2099-0001',
      title:         'Example claim',
      category:      'travel',
      policyId:      'EX-POLICY-1',
      reportedAt:    '2099-01-02T03:04',
      status:        'reported',
      handlerName:   null,
      incidentDate:  null,
      description:   null,
      photoDeadline: null,
      steps:         [{
        title: 'Example step', description: 'Example description', state: 'current', waitsForPhotos: false 
      }],
    });
    expect(verdict.seed.messages).toEqual([{
      id: 'EX-MESSAGE-1', title: 'Example message', sentOn: '2099-02-03', isRead: true, body: 'Example body' 
    }]);
  });

  it('converts decimal euro strings to cents exactly, without binary floating point drift', async () => {
    for (const [decimalEuros, expectedCents] of [['12.30', 1230], ['0.29', 29], ['1000.01', 100_001], ['0.07', 7]] as const) {
      const document = syntheticSeedDocument();
      document['policies'] = [{ ...(syntheticSeedDocument()['policies'] as Record<string, unknown>[])[0], monthlyPremiumEuros: decimalEuros }];

      const verdict = await new SeedIngestion(await seedPathFor(document)).read();

      expect(verdict.outcome === 'valid' && verdict.seed.policies[0]?.monthlyPremiumCents).toBe(expectedCents);
    }
  });

  it('refuses an amount that is not a decimal string with two decimals, naming its path', async () => {
    const document = syntheticSeedDocument();
    document['policies'] = [{ ...(syntheticSeedDocument()['policies'] as Record<string, unknown>[])[0], monthlyPremiumEuros: '12,30' }];

    const verdict = await new SeedIngestion(await seedPathFor(document)).read();

    expect(verdict.outcome).toBe('invalid');
    expect(verdict.outcome === 'invalid' && verdict.problems.join('\n')).toContain('policies[0].monthlyPremiumEuros');
  });

  it('refuses a format version other than 1', async () => {
    const document = { ...syntheticSeedDocument(), formatVersion: 2 };

    const verdict = await new SeedIngestion(await seedPathFor(document)).read();

    expect(verdict).toEqual({ outcome: 'invalid', problems: ['The seed file has format version 2, but only version 1 is supported.'] });
  });

  it('names the path of every missing or malformed field', async () => {
    const document = syntheticSeedDocument();
    const customer = document['customer'] as Record<string, unknown>;
    delete customer['fullName'];
    customer['birthDate'] = '2099-02-30';
    document['messages'] = [{
      id: 'EX-MESSAGE-1', title: 'Example message', sentOn: '2099-02-03', isRead: 'yes', body: 'Example body' 
    }];

    const verdict = await new SeedIngestion(await seedPathFor(document)).read();

    expect(verdict.outcome).toBe('invalid');
    const problems = verdict.outcome === 'invalid' ? verdict.problems.join('\n') : '';
    expect(problems).toContain('customer.fullName');
    expect(problems).toContain('customer.birthDate');
    expect(problems).toContain('messages[0].isRead');
  });

  it('refuses an unknown Dutch enumeration value, naming the field and the value', async () => {
    const document = syntheticSeedDocument();
    document['claims'] = [{ ...(syntheticSeedDocument()['claims'] as Record<string, unknown>[])[0], status: 'example-status' }];

    const verdict = await new SeedIngestion(await seedPathFor(document)).read();

    expect(verdict.outcome === 'invalid' && verdict.problems).toEqual(['The seed field claim status has the unknown value "example-status". (claims[0].status)']);
  });

  it('refuses a file that is not JSON', async () => {
    const seedPath = join(temporaryDirectory, 'seed.json');
    await writeFile(seedPath, 'not json');

    const verdict = await new SeedIngestion(seedPath).read();

    expect(verdict.outcome).toBe('invalid');
  });

  it('locates the bundled seed in the API resources folder', () => {
    expect(bundledSeedPath()).toEndWith(join('apps', 'api', 'resources', 'seed.json'));
  });
});
