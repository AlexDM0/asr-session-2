/**
 * Pins what the real entry point does with the store at start-up: a missing store is
 * created and seeded; an unreadable store and one with another structure version make the process
 * exit with code 1 and an English message naming the problem and `bun run reset`, the file left byte
 * for byte as it was. The paths come from `createScratchStoreDirectory()` and are checked to lie in its
 * temporary root before `src/main.ts` is spawned, so the development store is never touched.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join, sep }           from 'node:path';
import { Database }            from 'bun:sqlite';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from 'bun:test';

import { type ScratchStoreDirectory, createScratchStoreDirectory } from './ScratchApiServer.setup';
import { bundledSeedPath }                                         from './adapters/seed/SeedIngestion';
import { buildSeededStore }                                        from './services/store/buildSeededStore';

const MAIN_MODULE_PATH = join(import.meta.dir, 'main.ts');
const STARTED_LINE_PATTERN = /Mijn Duinzicht API: (http:\/\/localhost:\d+)/;
const START_TIMEOUT_MILLISECONDS = 10_000;

let scratchDirectory: ScratchStoreDirectory;

beforeEach(async () => {
  scratchDirectory = await createScratchStoreDirectory();
  expect(scratchDirectory.databasePath.startsWith(`${scratchDirectory.temporaryRoot}${sep}`)).toBe(true);
  expect(scratchDirectory.uploadDirectory.startsWith(`${scratchDirectory.temporaryRoot}${sep}`)).toBe(true);
});

afterEach(async () => {
  await scratchDirectory.remove();
});

function spawnApi() {
  return Bun.spawn([process.execPath, MAIN_MODULE_PATH], {
    env: {
      ...process.env,
      DUINZICHT_DATABASE_PATH:    scratchDirectory.databasePath,
      DUINZICHT_UPLOAD_DIRECTORY: scratchDirectory.uploadDirectory,
      DUINZICHT_API_PORT:         '0',
    },
    stdout: 'pipe',
    stderr: 'pipe',
  });
}

async function originOnceStarted(output: ReadableStream<Uint8Array>): Promise<string> {
  const decoder = new TextDecoder();
  let printedText = '';
  for await (const chunk of output) {
    printedText += decoder.decode(chunk, { stream: true });
    const origin = STARTED_LINE_PATTERN.exec(printedText)?.[1];
    if (origin !== undefined) {
      return origin;
    }
  }
  throw new Error(`The API stopped without printing its address. It printed: ${printedText}`);
}

async function refusalOf(apiProcess: ReturnType<typeof spawnApi>): Promise<{ exitCode: number; printedText: string }> {
  const exitCode = await apiProcess.exited;
  const printedText = `${await new Response(apiProcess.stdout).text()}${await new Response(apiProcess.stderr).text()}`;
  return { exitCode, printedText };
}

describe('API start-up', () => {
  it('creates and seeds a missing store, then serves it', async () => {
    const apiProcess = spawnApi();
    try {
      const origin = await Promise.race([
        originOnceStarted(apiProcess.stdout),
        Bun.sleep(START_TIMEOUT_MILLISECONDS).then(() => 'no address within the time limit'),
      ]);
      const profile = await (await fetch(`${origin}/api/profile`)).json();

      expect(profile).toMatchObject({ customerNumber: '40218773', fullName: 'Sanne de Vries' });
      expect(await Bun.file(scratchDirectory.databasePath).exists()).toBe(true);
    } finally {
      apiProcess.kill();
      await apiProcess.exited;
    }
  });

  it('refuses a file that is not a database with exit code 1, names the problem and the reset command, and leaves the file unchanged', async () => {
    await writeFile(scratchDirectory.databasePath, 'This is an example text, not a database.');
    const contentBefore = await readFile(scratchDirectory.databasePath);

    const { exitCode, printedText } = await refusalOf(spawnApi());

    expect(exitCode).toBe(1);
    expect(printedText).toContain('cannot be read as a database');
    expect(printedText).toContain('bun run reset');
    expect(await readFile(scratchDirectory.databasePath)).toEqual(contentBefore);
  });

  it('refuses a store with structure version 99 with exit code 1, names both versions and the reset command, and leaves the file unchanged', async () => {
    await buildSeededStore({ databasePath: scratchDirectory.databasePath, seedPath: bundledSeedPath() });
    const connection = new Database(scratchDirectory.databasePath, { strict: true });
    connection.run('PRAGMA user_version = 99');
    connection.close();
    const contentBefore = await readFile(scratchDirectory.databasePath);

    const { exitCode, printedText } = await refusalOf(spawnApi());

    expect(exitCode).toBe(1);
    expect(printedText).toContain('structure version 99');
    expect(printedText).toContain('expects version 1');
    expect(printedText).toContain('bun run reset');
    expect(await readFile(scratchDirectory.databasePath)).toEqual(contentBefore);
  });
});
