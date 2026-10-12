/**
 * The store service is the one way into the store, and every handler relies on its transaction
 * behaviour. What matters: `work` commits when it returns and rolls back on any thrown error (which is
 * rethrown unchanged), a missing, unreadable or mismatched store is refused before `work` runs, and
 * the connection is closed in every case.
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir }                 from 'node:os';
import { join }                   from 'node:path';
import { Database }               from 'bun:sqlite';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from 'bun:test';

import { STORE_MIGRATIONS } from '../../adapters/store/migrations/storeMigrations';
import { PortalError }      from '../../shared/errors/PortalError';

import { createPortalStore } from './PortalStore';

let temporaryDirectory = '';
let databasePath = '';

function createMigratedStore(path: string, structureVersion: number): void {
  const connection = new Database(path, { create: true, readwrite: true, strict: true });
  for (const migration of STORE_MIGRATIONS) {
    for (const statement of migration.statements) {
      connection.run(statement);
    }
  }
  connection.run(`PRAGMA user_version = ${structureVersion}`);
  connection.close();
}

function insertExampleMessage(connection: Database, messageId: string): void {
  connection.run(`INSERT INTO customer VALUES ('12345678', 'Alex Example', 'Alex', 'AE', '2000-01-02', 'alex@example.com', 0, 2020,
    '06 00 00 00 00', 'Example Street 1', '1234 AB', 'Example City', 'NL00 EXAM 0000 0000 00', 'monthlyDirectDebit', 'A. Example')
    ON CONFLICT DO NOTHING`);
  connection.query<never, { messageId: string }>(
    'INSERT INTO message VALUES ($messageId, \'12345678\', \'Example message\', \'2099-01-02\', 0, \'Example body\')',
  ).run({ messageId });
}

function storedMessageIds(): string[] {
  return createPortalStore(databasePath).read((connection) => connection.query<{ message_id: string }, []>('SELECT message_id FROM message').all()
    .map((row) => row.message_id));
}

async function refusalOf(work: () => unknown): Promise<unknown> {
  try {
    await work();
  } catch (error) {
    return error;
  }
  return null;
}

beforeEach(async () => {
  temporaryDirectory = await mkdtemp(join(tmpdir(), 'portal-store-'));
  databasePath = join(temporaryDirectory, 'portal.sqlite');
});

afterEach(async () => {
  await rm(temporaryDirectory, { recursive: true, force: true });
});

describe('createPortalStore', () => {
  it('commits what write work stores and returns what the work returns', () => {
    createMigratedStore(databasePath, 1);
    const store = createPortalStore(databasePath);

    const result = store.write((connection) => {
      insertExampleMessage(connection, 'EX-MESSAGE-1');
      return 'example result';
    });

    expect(result).toBe('example result');
    expect(storedMessageIds()).toEqual(['EX-MESSAGE-1']);
  });

  it('rolls back and rethrows the same PortalError when the work throws one', async () => {
    createMigratedStore(databasePath, 1);
    const thrownError = new PortalError('unrepaired', 'invalidStoredValue', 'Example refusal.');

    const caughtError = await refusalOf(() => createPortalStore(databasePath).write((connection) => {
      insertExampleMessage(connection, 'EX-MESSAGE-1');
      throw thrownError;
    }));

    expect(caughtError).toBe(thrownError);
    expect(storedMessageIds()).toEqual([]);
  });

  it('rolls back and rethrows any other error the work throws', () => {
    createMigratedStore(databasePath, 1);

    expect(() => createPortalStore(databasePath).write((connection) => {
      insertExampleMessage(connection, 'EX-MESSAGE-1');
      throw new TypeError('Example failure.');
    })).toThrow(TypeError);
    expect(storedMessageIds()).toEqual([]);
  });

  it('runs read work inside a transaction that sees the committed data', () => {
    createMigratedStore(databasePath, 1);
    createPortalStore(databasePath).write((connection) => insertExampleMessage(connection, 'EX-MESSAGE-2'));

    const transactionWasOpen = createPortalStore(databasePath).read((connection) => connection.inTransaction);

    expect(transactionWasOpen).toBe(true);
    expect(storedMessageIds()).toEqual(['EX-MESSAGE-2']);
  });

  it('refuses a missing store with storeUnavailable before the work runs, and creates no file', async () => {
    let workRan = false;

    const refusal = await refusalOf(() => createPortalStore(databasePath).read(() => {
      workRan = true;
    }));

    expect(refusal).toBeInstanceOf(PortalError);
    expect(refusal instanceof PortalError && refusal.reason).toBe('storeUnavailable');
    expect(workRan).toBe(false);
    expect(await Bun.file(databasePath).exists()).toBe(false);
  });

  it('refuses a file that is not a database with storeUnavailable before the work runs', async () => {
    await writeFile(databasePath, 'This is an example text, not a database.');
    let workRan = false;

    const refusal = await refusalOf(() => createPortalStore(databasePath).write(() => {
      workRan = true;
    }));

    expect(refusal instanceof PortalError && refusal.reason).toBe('storeUnavailable');
    expect(workRan).toBe(false);
  });

  it('refuses a store with another structure version with storeUnavailable before the work runs', async () => {
    createMigratedStore(databasePath, 99);
    let workRan = false;

    const refusal = await refusalOf(() => createPortalStore(databasePath).read(() => {
      workRan = true;
    }));

    expect(refusal instanceof PortalError && refusal.reason).toBe('storeUnavailable');
    expect(refusal instanceof PortalError && refusal.message).toContain('99');
    expect(workRan).toBe(false);
  });

  it('closes the connection after work that returns and after work that throws', () => {
    createMigratedStore(databasePath, 1);
    const store = createPortalStore(databasePath);
    const handedConnections: Database[] = [];

    store.read((connection) => handedConnections.push(connection));
    expect(() => store.write((connection) => {
      handedConnections.push(connection);
      throw new Error('Example failure.');
    })).toThrow('Example failure.');

    for (const connection of handedConnections) {
      expect(() => connection.query('SELECT 1').get()).toThrow();
    }
  });
});
