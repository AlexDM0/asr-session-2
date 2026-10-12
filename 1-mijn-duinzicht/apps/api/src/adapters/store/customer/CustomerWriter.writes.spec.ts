/**
 * The update functions of the customer writer, run on the scratch store of a real server
 * and read back through `CustomerIngestion`: each writes only its own columns, a contact save marks
 * the e-mail address as confirmed without touching the stored year, and the changed row count is
 * what the handlers check (0 when the customer row is missing).
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

import { type ScratchApiServer, startScratchApiServer } from '../../../ScratchApiServer.setup';
import type { Profile }                                 from '../../../shared/model/Profile';
import { foundValueOf }                                 from '../IngestionVerdict';

import { CustomerIngestion }    from './CustomerIngestion';
import { createCustomerWriter } from './CustomerWriter';

const SYNTHETIC_CONTACT_DETAILS = {
  emailAddress:         'alex@example.com',
  phoneNumber:          '06 00 00 00 00',
  streetAndHouseNumber: 'Example Street 1',
  postcode:             '1234 AB',
  city:                 'Example City',
};

let scratchServer: ScratchApiServer;
let connection: Database;

beforeAll(async () => {
  scratchServer = await startScratchApiServer();
});

afterAll(async () => {
  await scratchServer.stop();
});

afterEach(async () => {
  connection.close();
  await scratchServer.reset();
});

function openScratchStore(): Database {
  connection = new Database(scratchServer.databasePath, { strict: true });
  return connection;
}

function storedProfile(): Profile | undefined {
  return foundValueOf(new CustomerIngestion(connection).readProfile(), 'profile');
}

describe('CustomerWriter.updateContactDetails', () => {
  it('sets the five contact columns and marks the e-mail address as confirmed', () => {
    const writer = createCustomerWriter(openScratchStore());

    expect(writer.updateContactDetails(SYNTHETIC_CONTACT_DETAILS)).toBe(1);

    expect(storedProfile()).toMatchObject({
      emailAddress:                  'alex@example.com',
      phoneNumber:                   '06 00 00 00 00',
      address:                       { streetAndHouseNumber: 'Example Street 1', postcode: '1234 AB', city: 'Example City' },
      emailAddressNeedsConfirmation: false,
    });
  });

  it('leaves the confirmation year, the payment and the personal columns untouched', () => {
    openScratchStore();
    const before = storedProfile();

    createCustomerWriter(connection).updateContactDetails(SYNTHETIC_CONTACT_DETAILS);

    const after = storedProfile();
    expect(after?.emailAddressLastConfirmedYear).toBe(before?.emailAddressLastConfirmedYear);
    expect([after?.iban, after?.accountHolder, after?.paymentMethod]).toEqual([before?.iban, before?.accountHolder, before?.paymentMethod]);
    expect([after?.fullName, after?.birthDate, after?.customerNumber]).toEqual([before?.fullName, before?.birthDate, before?.customerNumber]);
  });

  it('answers 0 changed rows when the customer row is missing', () => {
    openScratchStore().run('DELETE FROM customer');

    expect(createCustomerWriter(connection).updateContactDetails(SYNTHETIC_CONTACT_DETAILS)).toBe(0);
  });
});

describe('CustomerWriter.updatePaymentDetails', () => {
  it('sets only the IBAN and the account holder', () => {
    openScratchStore();
    const before = storedProfile();

    expect(createCustomerWriter(connection).updatePaymentDetails({ iban: 'NL00 EXAM 0000 0000 00', accountHolder: 'A. Example' })).toBe(1);

    const after = storedProfile();
    expect(after).toMatchObject({ iban: 'NL00 EXAM 0000 0000 00', accountHolder: 'A. Example' });
    expect(after?.paymentMethod).toBe(before?.paymentMethod);
    expect(after?.emailAddressNeedsConfirmation).toBe(before?.emailAddressNeedsConfirmation);
    expect([after?.emailAddress, after?.phoneNumber, after?.address]).toEqual([before?.emailAddress, before?.phoneNumber, before?.address]);
  });
});

describe('CustomerWriter.updatePreferences', () => {
  function storedPreferences() {
    return foundValueOf(new CustomerIngestion(connection).readPreferences(), 'preferences');
  }

  it('sets only the preferences present in the update and leaves the others', () => {
    openScratchStore();
    const before = storedPreferences();

    expect(createCustomerWriter(connection).updatePreferences({ paperMail: before?.paperMail !== true })).toBe(1);

    const after = storedPreferences();
    expect(after?.paperMail).toBe(before?.paperMail !== true);
    expect([after?.newsletter, after?.claimUpdateTextMessages]).toEqual([before?.newsletter, before?.claimUpdateTextMessages]);
  });

  it('stores several preferences as 0 and 1 at once', () => {
    openScratchStore();

    createCustomerWriter(connection).updatePreferences({ newsletter: false, claimUpdateTextMessages: true });

    expect(storedPreferences()).toMatchObject({ newsletter: false, claimUpdateTextMessages: true });
    expect(connection.query('SELECT newsletter, claim_update_text_messages FROM preferences').get()).toStrictEqual({ newsletter: 0, claim_update_text_messages: 1 });
  });
});
