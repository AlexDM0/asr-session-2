/**
 * The policy list read requests its path, maps a valid answer into the client model in its order,
 * and fails closed on an unknown kind.
 */
import {
  afterEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from 'bun:test';

import type { PolicySummary } from '../shared/model/Policy';

import { loadPolicies } from './PolicyAdapter';

const SYNTHETIC_SUMMARY: PolicySummary = {
  id:                  'EX-POLICY-1',
  policyNumber:        'EX-POLICY-1',
  kind:                'car',
  name:                'Example policy',
  subtitle:            'Example subtitle',
  monthlyPremiumCents: 1234,
  status:              'ended',
};

const requestedAddresses: string[] = [];

function answerEveryRequestWith(status: number, body: unknown): void {
  const answeringFetch = Object.assign(async (input: RequestInfo | URL) => {
    requestedAddresses.push(String(input));
    return Response.json(body, { status });
  }, { preconnect: globalThis.fetch.preconnect });
  spyOn(globalThis, 'fetch').mockImplementation(answeringFetch);
}

afterEach(() => {
  mock.restore();
  requestedAddresses.length = 0;
});

describe('loadPolicies', () => {
  it('requests /api/policies and maps the list in its order', async () => {
    answerEveryRequestWith(200, { policies: [SYNTHETIC_SUMMARY, { ...SYNTHETIC_SUMMARY, id: 'EX-POLICY-0' }] });

    const verdict = await loadPolicies(new AbortController().signal);

    expect(requestedAddresses).toEqual(['/api/policies']);
    expect(verdict.outcome === 'found' && verdict.value.map((policy) => policy.id)).toEqual(['EX-POLICY-1', 'EX-POLICY-0']);
  });

  it('fails on a policy kind that is not a known internal value', async () => {
    answerEveryRequestWith(200, { policies: [{ ...SYNTHETIC_SUMMARY, kind: 'exampleKind' }] });

    expect((await loadPolicies(new AbortController().signal)).outcome).toBe('failed');
  });
});
