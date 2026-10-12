/**
 * The registry pins the structure the code expects. What matters: versions stay contiguous from 1
 * (a new migration appends exactly the next one), the current version is the last entry's, and the
 * statements build every table and the single-current-step index on an empty database.
 */
import { Database }             from 'bun:sqlite';
import { describe, expect, it } from 'bun:test';

import { STORE_MIGRATIONS, currentStructureVersion } from './storeMigrations';

const EXPECTED_TABLES = [
  'claim',
  'claim_photo',
  'claim_step',
  'customer',
  'direct_debit_schedule',
  'message',
  'policy',
  'policy_coverage_item',
  'policy_fact',
  'preferences',
];

describe('STORE_MIGRATIONS', () => {
  it('numbers its versions contiguously from 1', () => {
    expect(STORE_MIGRATIONS.map((migration) => migration.version)).toEqual(STORE_MIGRATIONS.map((_migration, index) => index + 1));
  });

  it('makes the last entry\'s version the current structure version, which is 1 today', () => {
    expect(currentStructureVersion()).toBe(STORE_MIGRATIONS.at(-1)?.version ?? -1);
    expect(currentStructureVersion()).toBe(1);
  });

  it('creates every table and the unique partial index claim_step_single_current on an empty database', () => {
    const connection = new Database(':memory:', { strict: true });
    for (const migration of STORE_MIGRATIONS) {
      for (const statement of migration.statements) {
        connection.run(statement);
      }
    }

    const tableNames = connection.query<{ name: string }, []>('SELECT name FROM sqlite_schema WHERE type = \'table\' ORDER BY name').all().map((row) => row.name);
    const index = connection.query<{ sql: string }, []>('SELECT sql FROM sqlite_schema WHERE type = \'index\' AND name = \'claim_step_single_current\'').get();
    connection.close();

    expect(tableNames).toEqual(EXPECTED_TABLES);
    expect(index?.sql).toContain('UNIQUE INDEX');
    expect(index?.sql).toContain('WHERE state = \'current\'');
  });
});
