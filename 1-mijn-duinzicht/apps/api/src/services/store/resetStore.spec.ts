/**
 * The reset command repairs any store. What matters: it rebuilds from the seed whatever the old file
 * holds, including changed values and a file that is not a database, and empties the upload directory.
 */
import {
  mkdir,
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
import { resetStore }       from './resetStore';

let temporaryDirectory = '';
let databasePath = '';
let uploadDirectory = '';
let seedPath = '';

beforeEach(async () => {
  temporaryDirectory = await mkdtemp(join(tmpdir(), 'reset-store-'));
  databasePath = join(temporaryDirectory, 'portal.sqlite');
  uploadDirectory = join(temporaryDirectory, 'uploads');
  seedPath = await writeSyntheticSeed(temporaryDirectory);
});

afterEach(async () => {
  await rm(temporaryDirectory, { recursive: true, force: true });
});

function storedFullName(): string | undefined {
  const connection = new Database(databasePath, { readonly: true, strict: true });
  const row = connection.query<{ full_name: string }, []>('SELECT full_name FROM customer').get();
  connection.close();
  return row?.full_name;
}

describe('resetStore', () => {
  it('restores the seed value over a changed store', async () => {
    await buildSeededStore({ databasePath, seedPath });
    const connection = new Database(databasePath, { strict: true });
    connection.run('UPDATE customer SET full_name = \'Changed Example\'');
    connection.close();

    expect(await resetStore({ databasePath, uploadDirectory, seedPath })).toEqual({ outcome: 'built' });
    expect(storedFullName()).toBe('Alex Example');
  });

  it('rebuilds a file that is not a database', async () => {
    await writeFile(databasePath, 'This is an example text, not a database.');

    await resetStore({ databasePath, uploadDirectory, seedPath });

    expect(storedFullName()).toBe('Alex Example');
  });

  it('empties the upload directory, nested folders included, and keeps the directory', async () => {
    await mkdir(join(uploadDirectory, 'example-folder'), { recursive: true });
    await writeFile(join(uploadDirectory, 'example-photo.jpg'), 'example');
    await writeFile(join(uploadDirectory, 'example-folder', 'example-photo.png'), 'example');

    await resetStore({ databasePath, uploadDirectory, seedPath });

    expect(await readdir(uploadDirectory)).toEqual([]);
  });

  it('creates a missing upload directory', async () => {
    await resetStore({ databasePath, uploadDirectory, seedPath });

    expect(await readdir(uploadDirectory)).toEqual([]);
  });
});
