/**
 * The claim list read requests its path, maps each summary with its step states and photo-wait
 * flag, and fails closed on an unknown status or step state.
 */
import {
  afterEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from 'bun:test';

import type { ClaimSummary } from '../shared/model/Claim';

import { loadClaims } from './ClaimAdapter';

const SHARED_FIELDS: Omit<ClaimSummary, 'stepStates'> = {
  id:                   'S-2099-0001',
  title:                'Example claim',
  category:             'travel',
  policyId:             'EX-POLICY-1',
  policyName:           'Example policy',
  reportedAt:           '2099-01-02T03:04',
  status:               'reported',
  handlerName:          null,
  awaitsCustomerPhotos: true,
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

describe('loadClaims', () => {
  it('requests /api/claims and maps each summary with its step states', async () => {
    const summary: ClaimSummary = { ...SHARED_FIELDS, stepStates: ['done', 'current', 'todo'] };
    answerEveryRequestWith(200, { claims: [summary] });

    expect(await loadClaims(new AbortController().signal)).toEqual({ outcome: 'found', value: [summary] });
    expect(requestedAddresses).toEqual(['/api/claims']);
  });

  it('fails on a step state that is not a known internal value', async () => {
    answerEveryRequestWith(200, { claims: [{ ...SHARED_FIELDS, stepStates: ['exampleState'] }] });

    expect((await loadClaims(new AbortController().signal)).outcome).toBe('failed');
  });

  it('fails on a claim status that is not a known internal value', async () => {
    answerEveryRequestWith(200, { claims: [{ ...SHARED_FIELDS, status: 'exampleStatus', stepStates: [] }] });

    expect((await loadClaims(new AbortController().signal)).outcome).toBe('failed');
  });
});
