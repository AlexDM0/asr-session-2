/**
 * Start-up may create a store but must never touch an existing one. What matters: a missing store is
 * created and seeded, a current one is ready, and an unreadable or mismatched one is refused with the
 * file left byte for byte as it was.
 */
import {
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir }   from 'node:os';
import { join }     from 'node:path';
import { Database } from 'bun:sqlite';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from 'bun:test';

import { writeSyntheticSeed } from '../../adapters/seed/syntheticSeedDocument.setup';

import { buildSeededStore } from './buildSeededStore';
import { prepareStore }     from './prepareStore';

let temporaryDirectory = '';
let databasePath = '';
let seedPath = '';

beforeEach(async () => {
  temporaryDirectory = await mkdtemp(join(tmpdir(), 'prepare-store-'));
  databasePath = join(temporaryDirectory, 'portal.sqlite');
  seedPath = await writeSyntheticSeed(temporaryDirectory);
});

afterEach(async () => {
  await rm(temporaryDirectory, { recursive: true, force: true });
});

describe('prepareStore', () => {
  it('creates and seeds a missing store', async () => {
    expect(await prepareStore({ databasePath, seedPath })).toEqual({ outcome: 'created' });
    expect(await prepareStore({ databasePath, seedPath })).toEqual({ outcome: 'ready' });
  });

  it('answers ready for a current store and leaves it unchanged', async () => {
    await buildSeededStore({ databasePath, seedPath });
    const contentBefore = await readFile(databasePath);

    expect(await prepareStore({ databasePath, seedPath })).toEqual({ outcome: 'ready' });
    expect(await readFile(databasePath)).toEqual(contentBefore);
  });

  it('refuses a file that is not a database as unreadable and leaves it unchanged', async () => {
    await writeFile(databasePath, 'This is an example text, not a database.');
    const contentBefore = await readFile(databasePath);

    expect(await prepareStore({ databasePath, seedPath })).toEqual({ outcome: 'unreadable' });
    expect(await readFile(databasePath)).toEqual(contentBefore);
  });

  it('refuses a store with another structure version and leaves it unchanged', async () => {
    await buildSeededStore({ databasePath, seedPath });
    const connection = new Database(databasePath, { strict: true });
    connection.run('PRAGMA user_version = 99');
    connection.close();
    const contentBefore = await readFile(databasePath);

    expect(await prepareStore({ databasePath, seedPath })).toEqual({ outcome: 'versionMismatch', foundVersion: 99 });
    expect(await readFile(databasePath)).toEqual(contentBefore);
  });
});
