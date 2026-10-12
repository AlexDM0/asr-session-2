/**
 * Covers the customer writer through the ingestion that reads its rows back. What matters: a written
 * profile, preferences and schedule come back unchanged, a missing row is `absent` (a missing schedule
 * means nothing is scheduled), and a value outside its constraint fails closed with its path.
 */
import type { Database } from 'bun:sqlite';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from 'bun:test';

import {
  SYNTHETIC_PROFILE,
  corruptStoredValue,
  openScratchStoreConnection,
  openScratchStoreConnectionWithSyntheticCustomer,
} from '../scratchStoreConnection.setup';

import { CustomerIngestion }    from './CustomerIngestion';
import { createCustomerWriter } from './CustomerWriter';

let connection: Database;

beforeEach(() => {
  connection = openScratchStoreConnectionWithSyntheticCustomer();
});

afterEach(() => {
  connection.close();
});

describe('CustomerIngestion', () => {
  it('reads back the profile the writer stored', () => {
    expect(new CustomerIngestion(connection).readProfile()).toEqual({ outcome: 'found', value: SYNTHETIC_PROFILE });
  });

  it('reads back the preferences and the direct-debit schedule the writer stored', () => {
    const writer = createCustomerWriter(connection);
    writer.insertPreferences(SYNTHETIC_PROFILE.customerNumber, { paperMail: true, newsletter: false, claimUpdateTextMessages: true });
    writer.insertDirectDebitSchedule(SYNTHETIC_PROFILE.customerNumber, { nextCollectionDate: '2099-03-04' });

    const ingestion = new CustomerIngestion(connection);

    expect(ingestion.readPreferences()).toEqual({ outcome: 'found', value: { paperMail: true, newsletter: false, claimUpdateTextMessages: true } });
    expect(ingestion.readDirectDebitSchedule()).toEqual({ outcome: 'found', value: { nextCollectionDate: '2099-03-04' } });
  });

  it('answers absent when no customer, preferences or schedule row exists', () => {
    const emptyConnection = openScratchStoreConnection();
    const ingestion = new CustomerIngestion(emptyConnection);

    expect(ingestion.readProfile()).toEqual({ outcome: 'absent' });
    expect(ingestion.readPreferences()).toEqual({ outcome: 'absent' });
    expect(ingestion.readDirectDebitSchedule()).toEqual({ outcome: 'absent' });
    emptyConnection.close();
  });

  it('fails closed with the path of a payment method that is not a known internal value', () => {
    corruptStoredValue(connection, 'UPDATE customer SET payment_method = \'examplePayment\'');

    expect(new CustomerIngestion(connection).readProfile()).toEqual({ outcome: 'invalid', failedPaths: ['customer.payment_method'] });
  });

  it('fails closed on an impossible birth date and an empty name', () => {
    corruptStoredValue(connection, 'UPDATE customer SET birth_date = \'2099-02-30\', full_name = \'\'');

    expect(new CustomerIngestion(connection).readProfile()).toEqual({ outcome: 'invalid', failedPaths: ['customer.full_name', 'customer.birth_date'] });
  });

  it('fails closed on a flag that is neither 0 nor 1', () => {
    createCustomerWriter(connection).insertPreferences(SYNTHETIC_PROFILE.customerNumber, { paperMail: false, newsletter: false, claimUpdateTextMessages: false });
    corruptStoredValue(connection, 'UPDATE preferences SET newsletter = 2');

    expect(new CustomerIngestion(connection).readPreferences()).toEqual({ outcome: 'invalid', failedPaths: ['preferences.newsletter'] });
  });

  it('fails closed on a malformed collection date', () => {
    createCustomerWriter(connection).insertDirectDebitSchedule(SYNTHETIC_PROFILE.customerNumber, { nextCollectionDate: '2099-01-01' });
    corruptStoredValue(connection, 'UPDATE direct_debit_schedule SET next_collection_date = \'2099-13-01\'');

    expect(new CustomerIngestion(connection).readDirectDebitSchedule()).toEqual({ outcome: 'invalid', failedPaths: ['direct_debit_schedule.next_collection_date'] });
  });
});
