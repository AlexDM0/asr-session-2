import { Database } from 'bun:sqlite';

import type { Profile } from '../../shared/model/Profile';

import { createCustomerWriter } from './customer/CustomerWriter';
import { STORE_MIGRATIONS }     from './migrations/storeMigrations';

export const SYNTHETIC_PROFILE: Profile = {
  customerNumber:                '12345678',
  fullName:                      'Alex Example',
  firstName:                     'Alex',
  initials:                      'AE',
  birthDate:                     '2000-01-02',
  emailAddress:                  'alex@example.com',
  emailAddressNeedsConfirmation: true,
  emailAddressLastConfirmedYear: 2020,
  phoneNumber:                   '06 00 00 00 00',
  address:                       { streetAndHouseNumber: 'Example Street 1', postcode: '1234 AB', city: 'Example City' },
  iban:                          'NL00 EXAM 0000 0000 00',
  paymentMethod:                 'monthlyDirectDebit',
  accountHolder:                 'A. Example',
};

/** An in-memory store with every migration applied, for ingestion specs; it never touches a file. */
export function openScratchStoreConnection(): Database {
  const connection = new Database(':memory:', { strict: true });
  connection.run('PRAGMA foreign_keys = ON');
  for (const migration of STORE_MIGRATIONS) {
    for (const statement of migration.statements) {
      connection.run(statement);
    }
  }
  return connection;
}

export function openScratchStoreConnectionWithSyntheticCustomer(): Database {
  const connection = openScratchStoreConnection();
  createCustomerWriter(connection).insertProfile(SYNTHETIC_PROFILE);
  return connection;
}

/** Writes a value outside its column constraint, as a corrupted store would hold it. */
export function corruptStoredValue(connection: Database, statement: string): void {
  connection.run('PRAGMA ignore_check_constraints = ON');
  connection.run(statement);
  connection.run('PRAGMA ignore_check_constraints = OFF');
}
