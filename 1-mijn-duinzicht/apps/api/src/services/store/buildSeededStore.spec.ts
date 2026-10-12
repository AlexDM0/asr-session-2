/**
 * Building is how a store comes into existence, at start-up and on reset. What matters: the result is
 * a complete store at the current structure version holding the seed, it replaces whatever the target
 * held in one rename, and it leaves no temporary or journal file behind; an invalid seed builds nothing.
 */
import {
  mkdtemp,
  readdir,
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

let temporaryDirectory = '';
let databasePath = '';
let seedPath = '';

beforeEach(async () => {
  temporaryDirectory = await mkdtemp(join(tmpdir(), 'build-seeded-store-'));
  databasePath = join(temporaryDirectory, 'data', 'portal.sqlite');
  seedPath = await writeSyntheticSeed(temporaryDirectory);
});

afterEach(async () => {
  await rm(temporaryDirectory, { recursive: true, force: true });
});

function storedValue<Row>(sql: string): Row | null {
  const connection = new Database(databasePath, { readonly: true, strict: true });
  const row = connection.query<Row, []>(sql).get();
  connection.close();
  return row;
}

describe('buildSeededStore', () => {
  it('builds a store holding the seed at the current structure version, creating the missing directory', async () => {
    expect(await buildSeededStore({ databasePath, seedPath })).toEqual({ outcome: 'built' });

    expect(storedValue<{ user_version: number }>('PRAGMA user_version')).toEqual({ user_version: 1 });
    expect(storedValue<{ full_name: string }>('SELECT full_name FROM customer')).toEqual({ full_name: 'Alex Example' });
    expect(storedValue<{ monthly_premium_cents: number }>('SELECT monthly_premium_cents FROM policy')).toEqual({ monthly_premium_cents: 1230 });
    expect(storedValue<{ count: number }>('SELECT count(*) AS count FROM claim_step')).toEqual({ count: 1 });
  });

  it('replaces whatever file the target held by renaming the new store over it', async () => {
    await buildSeededStore({ databasePath, seedPath });
    await writeFile(databasePath, 'This is an example text, not a database.');

    await buildSeededStore({ databasePath, seedPath });

    expect(storedValue<{ first_name: string }>('SELECT first_name FROM customer')).toEqual({ first_name: 'Alex' });
  });

  it('leaves no temporary building file and no journal beside the target', async () => {
    await buildSeededStore({ databasePath, seedPath });
    await writeFile(`${databasePath}-journal`, '');

    await buildSeededStore({ databasePath, seedPath });

    expect((await readdir(join(temporaryDirectory, 'data'))).sort()).toEqual(['portal.sqlite']);
  });

  it('builds nothing from an invalid seed and reports its problems', async () => {
    await writeFile(seedPath, JSON.stringify({ formatVersion: 1 }));

    const verdict = await buildSeededStore({ databasePath, seedPath });

    expect(verdict.outcome).toBe('seedInvalid');
    expect(await Bun.file(databasePath).exists()).toBe(false);
  });
});
