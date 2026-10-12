/**
 * The scratch helpers are what keeps every API suite away from the development store, and the
 * end-to-end suites rely on their restart and reset. The cases that matter: a path outside the
 * temporary root (the development store above all) is refused with the reason, the paths it hands
 * out lie inside that root, a written value survives `restart()`, `reset()` restores the seed, and
 * `stop()` cleans up.
 */
import { stat }                 from 'node:fs/promises';
import { tmpdir }               from 'node:os';
import { join, sep }            from 'node:path';
import { Database }             from 'bun:sqlite';
import { describe, expect, it } from 'bun:test';

import { ApiEnvironment }                                     from './ApiEnvironment';
import { createScratchStoreDirectory, startScratchApiServer } from './ScratchApiServer.setup';

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function refusalMessageOf(start: () => Promise<unknown>): Promise<string> {
  try {
    await start();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  return 'no refusal';
}

function changeStoredFirstName(databasePath: string, firstName: string): void {
  const connection = new Database(databasePath, { strict: true });
  connection.query<never, { firstName: string }>('UPDATE customer SET first_name = $firstName').run({ firstName });
  connection.close();
}

async function storedFirstNameAt(origin: string): Promise<unknown> {
  const profile: unknown = await (await fetch(`${origin}/api/profile`)).json();
  return typeof profile === 'object' && profile !== null ? Reflect.get(profile, 'firstName') : undefined;
}

describe('createScratchStoreDirectory', () => {
  it('hands out a database path and an upload directory inside a fresh temporary root, and remove() deletes it', async () => {
    const scratchDirectory = await createScratchStoreDirectory();

    expect(scratchDirectory.databasePath.startsWith(`${scratchDirectory.temporaryRoot}${sep}`)).toBe(true);
    expect(scratchDirectory.uploadDirectory.startsWith(`${scratchDirectory.temporaryRoot}${sep}`)).toBe(true);
    expect(await pathExists(scratchDirectory.temporaryRoot)).toBe(true);

    await scratchDirectory.remove();

    expect(await pathExists(scratchDirectory.temporaryRoot)).toBe(false);
  });

  it('refuses the development store path and says why', async () => {
    const message = await refusalMessageOf(() => createScratchStoreDirectory({ databasePath: ApiEnvironment.databasePath }));

    expect(message).toContain(`Refusing to use the database path ${ApiEnvironment.databasePath}`);
    expect(message).toContain('outside the temporary directory');
  });

  it('refuses an upload directory that escapes the temporary root', async () => {
    const message = await refusalMessageOf(() => createScratchStoreDirectory({ uploadDirectory: '../example-uploads' }));

    expect(message).toContain('Refusing to use the upload directory');
  });

  it('refuses the temporary root itself as the upload directory', async () => {
    expect(await refusalMessageOf(() => createScratchStoreDirectory({ uploadDirectory: '.' }))).toContain('Refusing to use the upload directory');
  });
});

describe('startScratchApiServer', () => {
  it('refuses the development store and the development upload directory', async () => {
    expect(await refusalMessageOf(() => startScratchApiServer({ databasePath: ApiEnvironment.databasePath }))).toContain('Refusing to use the database path');
    expect(await refusalMessageOf(() => startScratchApiServer({ uploadDirectory: ApiEnvironment.uploadDirectory }))).toContain('Refusing to use the upload directory');
  });

  it('refuses an absolute path elsewhere in the system temporary directory', async () => {
    expect(await refusalMessageOf(() => startScratchApiServer({ databasePath: join(tmpdir(), 'example.sqlite') }))).toContain('outside the temporary directory');
  });

  it('keeps a value written before restart() and reads it back after', async () => {
    const scratchServer = await startScratchApiServer();
    try {
      changeStoredFirstName(scratchServer.databasePath, 'Changed Example');

      await scratchServer.restart();

      expect(await storedFirstNameAt(scratchServer.origin)).toBe('Changed Example');
    } finally {
      await scratchServer.stop();
    }
  });

  it('restores the seed value on reset() while the server runs', async () => {
    const scratchServer = await startScratchApiServer();
    try {
      const seedFirstName = await storedFirstNameAt(scratchServer.origin);
      changeStoredFirstName(scratchServer.databasePath, 'Changed Example');

      await scratchServer.reset();

      expect(await storedFirstNameAt(scratchServer.origin)).toBe(seedFirstName);
    } finally {
      await scratchServer.stop();
    }
  });

  it('removes the scratch directory on stop()', async () => {
    const scratchServer = await startScratchApiServer();

    await scratchServer.stop();

    expect(await pathExists(scratchServer.databasePath)).toBe(false);
    expect(await pathExists(scratchServer.uploadDirectory)).toBe(false);
  });
});
