/**
 * The profile read requests its path, maps a valid answer into the client model, and fails closed on
 * a malformed answer or an unknown internal value. Its read has no id, so a 404 can only be a failure.
 */
import {
  afterEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from 'bun:test';

import type { Profile } from '../shared/model/Profile';

import { loadProfile } from './ProfileAdapter';

const SYNTHETIC_PROFILE_ANSWER: Profile = {
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
  paymentMethod:                 'monthlyDirectDebit',
  accountHolder:                 'A. Example',
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

describe('loadProfile', () => {
  it('requests /api/profile and maps a valid answer to found', async () => {
    answerEveryRequestWith(200, SYNTHETIC_PROFILE_ANSWER);

    expect(await loadProfile(new AbortController().signal)).toEqual({ outcome: 'found', value: SYNTHETIC_PROFILE_ANSWER });
    expect(requestedAddresses).toEqual(['/api/profile']);
  });

  it('fails on an unknown payment method', async () => {
    answerEveryRequestWith(200, { ...SYNTHETIC_PROFILE_ANSWER, paymentMethod: 'examplePayment' });

    expect((await loadProfile(new AbortController().signal)).outcome).toBe('failed');
  });

  it('fails on a malformed answer such as a missing address', async () => {
    const { address: _address, ...answerWithoutAddress } = SYNTHETIC_PROFILE_ANSWER;
    answerEveryRequestWith(200, answerWithoutAddress);

    expect((await loadProfile(new AbortController().signal)).outcome).toBe('failed');
  });

  it('fails on a 404, because the profile read has no id that could be unknown', async () => {
    answerEveryRequestWith(404, { error: { code: 'notFound', message: 'Example.' } });

    expect((await loadProfile(new AbortController().signal)).outcome).toBe('failed');
  });
});
