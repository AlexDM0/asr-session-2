import { Database } from 'bun:sqlite';

import { currentStructureVersion } from '../../adapters/store/migrations/storeMigrations';
import { PortalError }             from '../../shared/errors/PortalError';

export type StoreWork<Result> = (connection: Database) => Result;

export interface PortalStore {
  read<Result>(work: StoreWork<Result>): Result;
  write<Result>(work: StoreWork<Result>): Result;
}

const BUSY_TIMEOUT_MILLISECONDS = 2000;

function storeUnavailable(message: string): PortalError {
  return new PortalError('refused', 'storeUnavailable', message);
}

function openCheckedConnection(databasePath: string): Database {
  let connection: Database;
  try {
    connection = new Database(databasePath, { readwrite: true, create: false, strict: true });
  } catch {
    throw storeUnavailable(`The store at ${databasePath} does not exist or cannot be opened.`);
  }
  try {
    connection.run('PRAGMA foreign_keys = ON');
    connection.run(`PRAGMA busy_timeout = ${BUSY_TIMEOUT_MILLISECONDS}`);
    const structureVersion = connection.query<{ user_version: number }, []>('PRAGMA user_version').get()?.user_version;
    if (structureVersion !== currentStructureVersion()) {
      throw storeUnavailable(`The store at ${databasePath} has structure version ${structureVersion}, expected ${currentStructureVersion()}.`);
    }
    return connection;
  } catch (error) {
    connection.close();
    throw error instanceof PortalError ? error : storeUnavailable(`The store at ${databasePath} cannot be read as a database.`);
  }
}

/**
 * Every store access: a connection per call, so a reset that replaces the file is seen by the next
 * call; the structure version is checked before `work` runs; `work` runs synchronously inside one
 * transaction that commits when it returns and rolls back when it throws.
 */
export function createPortalStore(databasePath: string): PortalStore {
  function runInTransaction<Result>(beginStatement: string, work: StoreWork<Result>): Result {
    const connection = openCheckedConnection(databasePath);
    try {
      connection.run(beginStatement);
      const result = work(connection);
      connection.run('COMMIT');
      return result;
    } catch (error) {
      if (connection.inTransaction) {
        connection.run('ROLLBACK');
      }
      throw error;
    } finally {
      connection.close();
    }
  }

  return {
    read:  (work) => runInTransaction('BEGIN', work),
    write: (work) => runInTransaction('BEGIN IMMEDIATE', work),
  };
}
