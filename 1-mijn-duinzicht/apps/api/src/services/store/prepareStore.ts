import { stat }     from 'node:fs/promises';
import { Database } from 'bun:sqlite';

import { currentStructureVersion } from '../../adapters/store/migrations/storeMigrations';

import { type SeededStoreLocation, buildSeededStore } from './buildSeededStore';

export type PreparedStoreVerdict =
  | { readonly outcome: 'created' }
  | { readonly outcome: 'ready' }
  | { readonly outcome: 'unreadable' }
  | { readonly outcome: 'versionMismatch'; readonly foundVersion: number }
  | { readonly outcome: 'seedInvalid'; readonly problems: readonly string[] };

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function structureVersionOf(databasePath: string): number | null {
  try {
    const connection = new Database(databasePath, { readonly: true, strict: true });
    try {
      return connection.query<{ user_version: number }, []>('PRAGMA user_version').get()?.user_version ?? null;
    } finally {
      connection.close();
    }
  } catch {
    return null;
  }
}

/** The start-up decision: build and seed a missing store; an existing one is only inspected, read-only, never changed. */
export async function prepareStore(location: SeededStoreLocation): Promise<PreparedStoreVerdict> {
  if (!await pathExists(location.databasePath)) {
    const builtVerdict = await buildSeededStore(location);
    return builtVerdict.outcome === 'built' ? { outcome: 'created' } : builtVerdict;
  }
  const foundVersion = structureVersionOf(location.databasePath);
  if (foundVersion === null) {
    return { outcome: 'unreadable' };
  }
  if (foundVersion !== currentStructureVersion()) {
    return { outcome: 'versionMismatch', foundVersion };
  }
  return { outcome: 'ready' };
}
