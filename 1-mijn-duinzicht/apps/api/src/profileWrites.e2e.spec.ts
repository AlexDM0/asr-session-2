/**
 * Pins the profile section writes against the real server on a scratch store: normalisation, the
 * e-mail confirmation flag and the derived open action (asserted against the verbatim seed), every
 * refusal with its status and body, persistence across a restart, and fail closed on a corrupted or
 * missing customer row with nothing stored.
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

const CONTACT_DETAILS_PATH = '/api/profile/contact-details';
const PAYMENT_DETAILS_PATH = '/api/profile/payment-details';

const SEED_IBAN = 'NL91 INGB 0001 2348 21';

const SEED_CONTACT_DETAILS = {
  emailAddress:         'sanne.devries@example.nl',
  phoneNumber:          '06 12 34 56 78',
  streetAndHouseNumber: 'Lindelaan 12',
  postcode:             '3521 AB',
  city:                 'Utrecht',
};

const SYNTHETIC_CONTACT_DETAILS = {
  emailAddress:         ' alex@example.com ',
  phoneNumber:          '06 00 00 00 00',
  streetAndHouseNumber: 'Example Street 1',
  postcode:             '1234ab',
  city:                 'Example City',
};

let scratchServer: ScratchApiServer;

beforeAll(async () => {
  scratchServer = await startScratchApiServer();
});

afterAll(async () => {
  await scratchServer.stop();
});

afterEach(async () => {
  await scratchServer.reset();
});

interface Answer {
  readonly status: number;
  readonly body:   unknown;
}

async function answerTo(path: string, init: RequestInit = {}): Promise<Answer> {
  const response = await fetch(`${scratchServer.origin}${path}`, init);
  return { status: response.status, body: await response.json() };
}

function jsonWrite(path: string, body: unknown, method = 'PUT'): Promise<Answer> {
  return answerTo(path, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
}

async function storedProfile(): Promise<Record<string, unknown>> {
  return (await answerTo('/api/profile')).body as Record<string, unknown>;
}

async function openActionKinds(): Promise<unknown[]> {
  const { body } = await answerTo('/api/open-actions');
  return (body as { openActions: { kind: unknown }[] }).openActions.map((openAction) => openAction.kind);
}

function changeScratchStore(statement: string): void {
  const connection = new Database(scratchServer.databasePath, { strict: true });
  connection.run('PRAGMA ignore_check_constraints = ON');
  connection.run(statement);
  connection.close();
}

describe('PUT /api/profile/contact-details', () => {
  it('stores the normalised values and answers the stored profile with the e-mail address confirmed', async () => {
    const { status, body } = await jsonWrite(CONTACT_DETAILS_PATH, SYNTHETIC_CONTACT_DETAILS);

    expect(status).toBe(200);
    expect(body).toMatchObject({
      emailAddress:                  'alex@example.com',
      phoneNumber:                   '06 00 00 00 00',
      address:                       { streetAndHouseNumber: 'Example Street 1', postcode: '1234 AB', city: 'Example City' },
      emailAddressNeedsConfirmation: false,
    });
    expect(body).toStrictEqual(await storedProfile());
  });

  it('clears the confirmation flag and the open action on a save of the unchanged seed values, keeping the year 2023', async () => {
    expect(await openActionKinds()).toContain('confirmEmailAddress');

    const { status, body } = await jsonWrite(CONTACT_DETAILS_PATH, SEED_CONTACT_DETAILS);

    expect(status).toBe(200);
    expect(body).toMatchObject({ emailAddress: 'sanne.devries@example.nl', emailAddressNeedsConfirmation: false, emailAddressLastConfirmedYear: 2023 });
    expect(await openActionKinds()).not.toContain('confirmEmailAddress');
  });

  it('leaves the flag and the open action on a refused save', async () => {
    expect((await jsonWrite(CONTACT_DETAILS_PATH, { ...SEED_CONTACT_DETAILS, postcode: '35210 AB' })).status).toBe(422);

    expect((await storedProfile())['emailAddressNeedsConfirmation']).toBe(true);
    expect(await openActionKinds()).toContain('confirmEmailAddress');
  });

  it('refuses invalid values, read-only and unknown keys with every field error in order and stores nothing', async () => {
    const profileBefore = await storedProfile();

    const answer = await jsonWrite(CONTACT_DETAILS_PATH, {
      emailAddress:         'x',
      phoneNumber:          '1',
      streetAndHouseNumber: 'Street',
      postcode:             '1',
      city:                 '',
      fullName:             'A',
      iban:                 'NL00 EXAM 0000 0000 00',
    });

    expect(answer).toStrictEqual({
      status: 422,
      body:   {
        error: {
          code:        'validationFailed',
          message:     'The contact details are invalid.',
          fieldErrors: [
            { field: 'emailAddress', reason: 'invalidFormat' },
            { field: 'phoneNumber', reason: 'invalidFormat' },
            { field: 'streetAndHouseNumber', reason: 'invalidFormat' },
            { field: 'postcode', reason: 'invalidFormat' },
            { field: 'city', reason: 'required' },
            { field: 'fullName', reason: 'readOnlyField' },
            { field: 'iban', reason: 'unknownField' },
          ],
        },
      },
    });
    expect(await storedProfile()).toStrictEqual(profileBefore);
  });

  it('refuses a too long value and a missing or wrongly typed field', async () => {
    const { emailAddress: _missingEmailAddress, ...withoutEmailAddress } = SYNTHETIC_CONTACT_DETAILS;

    const answer = await jsonWrite(CONTACT_DETAILS_PATH, { ...withoutEmailAddress, phoneNumber: 600000000, city: 'a'.repeat(101) });

    expect(answer.body).toMatchObject({
      error: {
        fieldErrors: [
          { field: 'emailAddress', reason: 'required' },
          { field: 'phoneNumber', reason: 'invalidFormat' },
          { field: 'city', reason: 'tooLong' },
        ],
      },
    });
  });

  it('answers 400 malformedRequest for a wrong content type, invalid JSON and a body that is not an object', async () => {
    const wrongContentType = await answerTo(CONTACT_DETAILS_PATH, { method: 'PUT', headers: { 'content-type': 'text/plain' }, body: JSON.stringify(SYNTHETIC_CONTACT_DETAILS) });
    const invalidJson = await answerTo(CONTACT_DETAILS_PATH, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: 'not json' });

    expect(wrongContentType).toMatchObject({ status: 400, body: { error: { code: 'malformedRequest' } } });
    expect(invalidJson).toMatchObject({ status: 400, body: { error: { code: 'malformedRequest' } } });
    for (const nonObjectBody of [[SYNTHETIC_CONTACT_DETAILS], 'text', 1, null]) {
      expect(await jsonWrite(CONTACT_DETAILS_PATH, nonObjectBody)).toMatchObject({ status: 400, body: { error: { code: 'malformedRequest' } } });
    }
  });

  it('keeps a saved value across a server restart', async () => {
    await jsonWrite(CONTACT_DETAILS_PATH, SYNTHETIC_CONTACT_DETAILS);

    await scratchServer.restart();

    expect(await storedProfile()).toMatchObject({ emailAddress: 'alex@example.com', emailAddressNeedsConfirmation: false });
  });

  it('fails closed with 500 invalidStoredValue and stores nothing when the customer row is corrupted', async () => {
    changeScratchStore('UPDATE customer SET payment_method = \'examplePayment\'');

    expect(await jsonWrite(CONTACT_DETAILS_PATH, SYNTHETIC_CONTACT_DETAILS)).toMatchObject({ status: 500, body: { error: { code: 'invalidStoredValue' } } });

    changeScratchStore('UPDATE customer SET payment_method = \'monthlyDirectDebit\'');
    expect(await storedProfile()).toMatchObject({ emailAddress: 'sanne.devries@example.nl', emailAddressNeedsConfirmation: true });
  });

  it('fails closed with 500 invalidStoredValue when the customer row is missing', async () => {
    changeScratchStore('PRAGMA foreign_keys = OFF; DELETE FROM customer');

    expect(await jsonWrite(CONTACT_DETAILS_PATH, SYNTHETIC_CONTACT_DETAILS)).toMatchObject({ status: 500, body: { error: { code: 'invalidStoredValue' } } });
  });

  it('answers 405 operationNotOffered on PATCH and POST', async () => {
    for (const method of ['PATCH', 'POST']) {
      expect(await jsonWrite(CONTACT_DETAILS_PATH, SYNTHETIC_CONTACT_DETAILS, method)).toMatchObject({ status: 405, body: { error: { code: 'operationNotOffered' } } });
    }
  });
});

describe('PUT /api/profile/payment-details', () => {
  it('stores the IBAN in upper-case groups of four and keeps the payment method and the confirmation flag', async () => {
    const { status, body } = await jsonWrite(PAYMENT_DETAILS_PATH, { iban: 'nl00exam0000000000', accountHolder: ' A. Example ' });

    expect(status).toBe(200);
    expect(body).toMatchObject({
      iban:                          'NL00 EXAM 0000 0000 00',
      accountHolder:                 'A. Example',
      paymentMethod:                 'monthlyDirectDebit',
      emailAddressNeedsConfirmation: true,
      emailAddress:                  'sanne.devries@example.nl',
    });
    expect(body).toStrictEqual(await storedProfile());
  });

  it('leaves the verbatim seed IBAN byte for byte unchanged when it is saved again', async () => {
    const { accountHolder } = await storedProfile();

    const { body } = await jsonWrite(PAYMENT_DETAILS_PATH, { iban: SEED_IBAN, accountHolder });

    expect((body as Record<string, unknown>)['iban']).toBe(SEED_IBAN);
  });

  it('refuses a foreign IBAN and the payment method with field errors in order and stores nothing', async () => {
    const profileBefore = await storedProfile();

    const answer = await jsonWrite(PAYMENT_DETAILS_PATH, {
      iban: 'BE68 5390 0754 7034', accountHolder: 'A. Example', paymentMethod: 'monthlyDirectDebit', emailAddress: 'x' 
    });

    expect(answer).toStrictEqual({
      status: 422,
      body:   {
        error: {
          code:        'validationFailed',
          message:     'The payment details are invalid.',
          fieldErrors: [
            { field: 'iban', reason: 'invalidFormat' },
            { field: 'paymentMethod', reason: 'readOnlyField' },
            { field: 'emailAddress', reason: 'unknownField' },
          ],
        },
      },
    });
    expect(await storedProfile()).toStrictEqual(profileBefore);
  });

  it('refuses a missing IBAN as required and a too long account holder as too long', async () => {
    const { body } = await jsonWrite(PAYMENT_DETAILS_PATH, { accountHolder: 'a'.repeat(101) });

    expect(body).toMatchObject({ error: { fieldErrors: [{ field: 'iban', reason: 'required' }, { field: 'accountHolder', reason: 'tooLong' }] } });
  });

  it('answers 400 malformedRequest for a wrong content type, invalid JSON and a body that is not an object', async () => {
    const wrongContentType = await answerTo(PAYMENT_DETAILS_PATH, { method: 'PUT', headers: { 'content-type': 'text/plain' }, body: '{}' });
    const invalidJson = await answerTo(PAYMENT_DETAILS_PATH, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: '{' });

    expect(wrongContentType).toMatchObject({ status: 400, body: { error: { code: 'malformedRequest' } } });
    expect(invalidJson).toMatchObject({ status: 400, body: { error: { code: 'malformedRequest' } } });
    for (const nonObjectBody of [[], 'text', 1, null]) {
      expect(await jsonWrite(PAYMENT_DETAILS_PATH, nonObjectBody)).toMatchObject({ status: 400, body: { error: { code: 'malformedRequest' } } });
    }
  });

  it('keeps a saved IBAN across a server restart and masks the new IBAN in the next payment', async () => {
    await jsonWrite(PAYMENT_DETAILS_PATH, { iban: 'NL00 EXAM 0123 4567 89', accountHolder: 'A. Example' });

    await scratchServer.restart();

    expect(await storedProfile()).toMatchObject({ iban: 'NL00 EXAM 0123 4567 89', accountHolder: 'A. Example' });
    expect((await answerTo('/api/payments/next')).body).toMatchObject({ nextPayment: { maskedAccount: 'NL•• EXAM •••• 6789' } });
  });

  it('fails closed with 500 invalidStoredValue and stores nothing when the customer row is corrupted', async () => {
    changeScratchStore('UPDATE customer SET payment_method = \'examplePayment\'');

    const answer = await jsonWrite(PAYMENT_DETAILS_PATH, { iban: 'NL00 EXAM 0000 0000 00', accountHolder: 'A. Example' });

    expect(answer).toMatchObject({ status: 500, body: { error: { code: 'invalidStoredValue' } } });

    changeScratchStore('UPDATE customer SET payment_method = \'monthlyDirectDebit\'');
    expect(await storedProfile()).toMatchObject({ iban: SEED_IBAN });
  });

  it('answers 405 operationNotOffered on PATCH and POST', async () => {
    for (const method of ['PATCH', 'POST']) {
      const answer = await jsonWrite(PAYMENT_DETAILS_PATH, { iban: SEED_IBAN, accountHolder: 'A. Example' }, method);
      expect(answer).toMatchObject({ status: 405, body: { error: { code: 'operationNotOffered' } } });
    }
  });
});
