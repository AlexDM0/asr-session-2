import { randomUUID }        from 'node:crypto';
import { mkdir, rename, rm } from 'node:fs/promises';
import { dirname }           from 'node:path';
import { Database }          from 'bun:sqlite';

import { SeedIngestion }                             from '../../adapters/seed/SeedIngestion';
import { createClaimWriter }                         from '../../adapters/store/claims/ClaimWriter';
import { createCustomerWriter }                      from '../../adapters/store/customer/CustomerWriter';
import { createMessageWriter }                       from '../../adapters/store/messages/MessageWriter';
import { STORE_MIGRATIONS, currentStructureVersion } from '../../adapters/store/migrations/storeMigrations';
import { createPolicyWriter }                        from '../../adapters/store/policies/PolicyWriter';
import type { PortalSeed }                           from '../../shared/model/PortalSeed';

export interface SeededStoreLocation {
  readonly databasePath: string;
  readonly seedPath:     string;
}

export type SeededStoreVerdict =
  | { readonly outcome: 'built' }
  | { readonly outcome: 'seedInvalid'; readonly problems: readonly string[] };

const JOURNAL_SUFFIX = '-journal';

function writeSeed(connection: Database, seed: PortalSeed): void {
  const { customerNumber } = seed.customer;
  const customerWriter = createCustomerWriter(connection);
  customerWriter.insertProfile(seed.customer);
  customerWriter.insertPreferences(customerNumber, seed.preferences);
  if (seed.directDebitSchedule !== null) {
    customerWriter.insertDirectDebitSchedule(customerNumber, seed.directDebitSchedule);
  }
  const policyWriter = createPolicyWriter(connection);
  seed.policies.forEach((policy, index) => policyWriter.insertPolicy(customerNumber, policy, index + 1));
  const claimWriter = createClaimWriter(connection);
  seed.claims.forEach((claim) => claimWriter.insertClaim(customerNumber, claim));
  const messageWriter = createMessageWriter(connection);
  seed.messages.forEach((message) => messageWriter.insertMessage(customerNumber, message));
}

function buildStoreFile(path: string, seed: PortalSeed): void {
  const connection = new Database(path, { create: true, readwrite: true, strict: true });
  try {
    connection.run('PRAGMA foreign_keys = ON');
    for (const migration of STORE_MIGRATIONS) {
      for (const statement of migration.statements) {
        connection.run(statement);
      }
    }
    connection.run('BEGIN IMMEDIATE');
    writeSeed(connection, seed);
    connection.run('COMMIT');
    connection.run(`PRAGMA user_version = ${currentStructureVersion()}`);
  } finally {
    connection.close();
  }
}

/**
 * Builds a complete, seeded store at a temporary path beside the target and renames it over the
 * target, so a reader never sees a half-built store and whatever the target held is replaced whole.
 */
export async function buildSeededStore(location: SeededStoreLocation): Promise<SeededStoreVerdict> {
  const seedVerdict = await new SeedIngestion(location.seedPath).read();
  if (seedVerdict.outcome === 'invalid') {
    return { outcome: 'seedInvalid', problems: seedVerdict.problems };
  }
  await mkdir(dirname(location.databasePath), { recursive: true });
  const temporaryPath = `${location.databasePath}.building-${randomUUID()}`;
  try {
    buildStoreFile(temporaryPath, seedVerdict.seed);
    await rename(temporaryPath, location.databasePath);
  } finally {
    await rm(temporaryPath, { force: true });
    await rm(`${temporaryPath}${JOURNAL_SUFFIX}`, { force: true });
  }
  await rm(`${location.databasePath}${JOURNAL_SUFFIX}`, { force: true });
  return { outcome: 'built' };
}
